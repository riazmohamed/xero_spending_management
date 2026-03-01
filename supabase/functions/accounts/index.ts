import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { cachedXeroFetch } from "../_shared/xero-client.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);

    const where = 'Status=="ACTIVE"';
    const endpoint = `/Accounts?where=${encodeURIComponent(where)}&order=Code`;
    const cacheKey = `accounts_${session.userId}`;

    const data = await cachedXeroFetch(
      session.userId,
      endpoint,
      cacheKey,
      86400, // Cache 24 hours
    );

    return jsonResponse(data);
  } catch (err) {
    console.error("Accounts error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
