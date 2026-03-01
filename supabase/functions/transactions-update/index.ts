import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { xeroFetch } from "../_shared/xero-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "PUT") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);
    const { transactionId, lineItems } = await req.json();

    if (!transactionId || !lineItems) {
      return errorResponse("Missing transactionId or lineItems");
    }

    const response = await xeroFetch(
      session.userId,
      `/BankTransactions/${transactionId}`,
      {
        method: "POST",
        body: {
          BankTransactions: [
            {
              BankTransactionID: transactionId,
              LineItems: lineItems,
            },
          ],
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return errorResponse(`Xero API error: ${errorText}`, response.status);
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

    const data = await response.json();
    return jsonResponse(data.BankTransactions?.[0] || null);
  } catch (err) {
    console.error("Transaction update error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
