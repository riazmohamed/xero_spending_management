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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("Missing file");
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${session.userId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

    // 1. Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, fileBytes, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (storageError) {
      return errorResponse(`Storage upload failed: ${storageError.message}`, 500);
    }

    // 2. Insert receipt record
    const { data: receipt, error: insertError } = await supabase
      .from("receipts")
      .insert({
        user_id: session.userId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || "image/jpeg",
        file_size_bytes: fileBytes.length,
        status: "processing",
      })
      .select()
      .single();

    if (insertError || !receipt) {
      return errorResponse(`Failed to create receipt: ${insertError?.message}`, 500);
    }

    // 3. Inline OCR extraction
    try {
      const base64 = btoa(String.fromCharCode(...fileBytes));
      const mimeType = file.type || "image/jpeg";
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
        })
        .eq("id", receipt.id);

      // 4. Inline matching
      try {
        const matchResult = await matchReceipt(
          supabase,
          session.userId,
          receipt.id,
          ocrResult,
        );

        // Fetch the fully updated receipt
        const { data: finalReceipt } = await supabase
          .from("receipts")
          .select()
          .eq("id", receipt.id)
          .single();

        // Generate signed URL for the image
        const { data: signedUrl } = await supabase.storage
          .from("receipts")
          .createSignedUrl(storagePath, 3600);

        return jsonResponse({
          ...finalReceipt,
          image_url: signedUrl?.signedUrl || null,
          match_result: matchResult,
        });
      } catch (matchErr) {
        console.error("Matching error (non-fatal):", matchErr);
      }
    } catch (ocrErr) {
      console.error("OCR error (non-fatal):", ocrErr);
      // Update status to extracted-failed but don't block the response
      await supabase
        .from("receipts")
        .update({
          status: "pending",
          error_message: ocrErr instanceof Error ? ocrErr.message : "OCR failed",
        })
        .eq("id", receipt.id);
    }

    // Return whatever we have (even if OCR/matching failed)
    const { data: currentReceipt } = await supabase
      .from("receipts")
      .select()
      .eq("id", receipt.id)
      .single();

    const { data: signedUrl } = await supabase.storage
      .from("receipts")
      .createSignedUrl(storagePath, 3600);

    return jsonResponse({
      ...currentReceipt,
      image_url: signedUrl?.signedUrl || null,
    });
  } catch (err) {
    console.error("Receipt upload error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
