import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { matchReceipt } from "../_shared/receipt-matcher.ts";
import type { ReceiptOCRResult } from "../_shared/types.ts";

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

    const { data: receipt, error } = await supabase
      .from("receipts")
      .select()
      .eq("id", receiptId)
      .eq("user_id", session.userId)
      .single();

    if (error || !receipt) {
      return errorResponse("Receipt not found", 404);
    }

    if (!receipt.total_amount && !receipt.merchant_name) {
      return errorResponse("Receipt has no OCR data to match against");
    }

    const ocrResult: ReceiptOCRResult = {
      merchant_name: receipt.merchant_name,
      transaction_date: receipt.transaction_date,
      total_amount: receipt.total_amount,
      subtotal: receipt.subtotal_amount,
      tax_amount: receipt.tax_amount,
      currency: receipt.currency,
      payment_method: receipt.payment_method,
      abn: receipt.abn,
      line_items: receipt.line_items || [],
    };

    const result = await matchReceipt(supabase, session.userId, receiptId, ocrResult);

    const { data: updatedReceipt } = await supabase
      .from("receipts")
      .select()
      .eq("id", receiptId)
      .single();

    return jsonResponse({
      ...updatedReceipt,
      match_result: result,
    });
  } catch (err) {
    console.error("Receipt match error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
