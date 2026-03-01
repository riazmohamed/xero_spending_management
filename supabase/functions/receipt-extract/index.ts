import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractReceiptData } from "../_shared/openrouter.ts";
import { matchReceipt } from "../_shared/receipt-matcher.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);
    const { receiptId } = await req.json();

    if (!receiptId) {
      return errorResponse("Missing receiptId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch receipt
    const { data: receipt, error: fetchError } = await supabase
      .from("receipts")
      .select()
      .eq("id", receiptId)
      .eq("user_id", session.userId)
      .single();

    if (fetchError || !receipt) {
      return errorResponse("Receipt not found", 404);
    }

    // Update status to processing
    await supabase
      .from("receipts")
      .update({ status: "processing", error_message: null })
      .eq("id", receiptId);

    // Download image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(receipt.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from("receipts")
        .update({ status: "failed", error_message: "Failed to download image" })
        .eq("id", receiptId);
      return errorResponse("Failed to download receipt image", 500);
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...bytes));
    const mimeType = receipt.mime_type || "image/jpeg";

    // Extract OCR data
    const ocrResult = await extractReceiptData(base64, mimeType);

    // Update receipt with OCR results
    await supabase
      .from("receipts")
      .update({
        merchant_name: ocrResult.merchant_name,
        total_amount: ocrResult.total_amount,
        subtotal_amount: ocrResult.subtotal,
        tax_amount: ocrResult.tax_amount,
        transaction_date: ocrResult.transaction_date,
        currency: ocrResult.currency || "AUD",
        payment_method: ocrResult.payment_method,
        abn: ocrResult.abn,
        line_items: ocrResult.line_items,
        raw_ocr_response: ocrResult,
        status: "extracted",
        extracted_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", receiptId);

    // Run matching
    try {
      await matchReceipt(supabase, session.userId, receiptId, ocrResult);
    } catch (matchErr) {
      console.error("Matching error (non-fatal):", matchErr);
    }

    // Return updated receipt
    const { data: updatedReceipt } = await supabase
      .from("receipts")
      .select()
      .eq("id", receiptId)
      .single();

    const { data: signedUrl } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receipt.storage_path, 3600);

    return jsonResponse({
      ...updatedReceipt,
      image_url: signedUrl?.signedUrl || null,
    });
  } catch (err) {
    console.error("Receipt extract error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
