import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { cachedXeroFetch, xeroFetch } from "../_shared/xero-client.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      // Get single transaction
      const response = await xeroFetch(
        session.userId,
        `/BankTransactions/${id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return errorResponse(`Xero API error: ${errorText}`, response.status);
      }

      const data = await response.json();
      return jsonResponse(data.BankTransactions?.[0] || null);
    }

    // List unreconciled transactions
    const page = url.searchParams.get("page") || "1";
    const where = 'IsReconciled==false AND Status=="AUTHORISED"';
    const orderBy = "Date DESC";
    const endpoint = `/BankTransactions?where=${encodeURIComponent(where)}&order=${encodeURIComponent(orderBy)}&page=${page}`;
    const cacheKey = `transactions_${session.userId}_p${page}`;

    const data = await cachedXeroFetch(
      session.userId,
      endpoint,
      cacheKey,
      300, // Cache 5 minutes
    );

    return jsonResponse(data);
  } catch (err) {
    console.error("Transactions error:", err);
    if (err instanceof Error && err.message === "XERO_RATE_LIMITED") {
      return errorResponse("Rate limited by Xero. Please wait a moment.", 429);
    }
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
