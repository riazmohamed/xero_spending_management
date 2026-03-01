import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { xeroFetch } from "../_shared/xero-client.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");

    if (!transactionId) {
      return errorResponse("Missing transactionId");
    }

    const response = await xeroFetch(
      session.userId,
      `/BankTransactions/${transactionId}/Attachments`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      return errorResponse(`Xero API error: ${errorText}`, response.status);
    }

    const data = await response.json();
    return jsonResponse(data.Attachments || []);
  } catch (err) {
    console.error("Attachments list error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
