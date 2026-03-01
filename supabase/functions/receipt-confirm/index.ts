import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { xeroFetch } from "../_shared/xero-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);
    const { receiptId, transactionId } = await req.json();

    if (!receiptId || !transactionId) {
      return errorResponse("Missing receiptId or transactionId");
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

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(receipt.storage_path);

    if (downloadError || !fileData) {
      return errorResponse("Failed to download receipt file", 500);
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const ext = receipt.storage_path.split(".").pop() || "jpg";
    const fileName = `receipt_${Date.now()}.${ext}`;

    // Upload to Xero as attachment on the bank transaction
    const xeroResponse = await xeroFetch(
      session.userId,
      `/BankTransactions/${transactionId}/Attachments/${encodeURIComponent(fileName)}`,
      {
        method: "PUT",
        rawBody: fileBytes,
        contentType: receipt.mime_type || "image/jpeg",
      },
    );

    if (!xeroResponse.ok) {
      const errorText = await xeroResponse.text();
      return errorResponse(
        `Failed to upload to Xero: ${errorText}`,
        xeroResponse.status,
      );
    }

    const xeroData = await xeroResponse.json();
    const attachmentId = xeroData.Attachments?.[0]?.AttachmentID || null;

    // Update receipt status
    await supabase
      .from("receipts")
      .update({
        status: "uploaded",
        matched_transaction_id: transactionId,
        xero_attachment_id: attachmentId,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", receiptId);

    // Learn merchant alias
    if (receipt.merchant_name) {
      // Get the contact name from the transaction
      const txResponse = await xeroFetch(
        session.userId,
        `/BankTransactions/${transactionId}`,
      );
      if (txResponse.ok) {
        const txData = await txResponse.json();
        const contactName = txData.BankTransactions?.[0]?.Contact?.Name;
        if (contactName) {
          await supabase.rpc("upsert_merchant_alias", {
            p_user_id: session.userId,
            p_receipt_merchant: receipt.merchant_name,
            p_xero_contact_name: contactName,
          });
        }
      }
    }

    // Invalidate caches
    await supabase
      .from("cache")
      .delete()
      .like("key", `transactions_${session.userId}%`);
    await supabase
      .from("cache")
      .delete()
      .like("key", `summary_${session.userId}%`);

    // Return updated receipt
    const { data: updatedReceipt } = await supabase
      .from("receipts")
      .select()
      .eq("id", receiptId)
      .single();

    return jsonResponse(updatedReceipt);
  } catch (err) {
    console.error("Receipt confirm error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
