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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const transactionId = formData.get("transactionId") as string | null;
    const fileName = formData.get("fileName") as string | null;

    if (!file || !transactionId) {
      return errorResponse("Missing file or transactionId");
    }

    const finalFileName =
      fileName || `receipt_${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // Upload directly to Xero as attachment on the bank transaction
    const response = await xeroFetch(
      session.userId,
      `/BankTransactions/${transactionId}/Attachments/${encodeURIComponent(finalFileName)}`,
      {
        method: "PUT",
        rawBody: fileBytes,
        contentType: file.type || "image/jpeg",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return errorResponse(
        `Failed to upload attachment: ${errorText}`,
        response.status,
      );
    }

    // Invalidate transaction cache
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase
      .from("cache")
      .delete()
      .like("key", `transactions_${session.userId}%`);
    await supabase
      .from("cache")
      .delete()
      .like("key", `summary_${session.userId}%`);

    const data = await response.json();
    return jsonResponse(data.Attachments?.[0] || data);
  } catch (err) {
    console.error("Attachment upload error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
