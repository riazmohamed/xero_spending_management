import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession, storeTokens } from "../_shared/token-manager.ts";
import { getValidAccessToken } from "../_shared/token-manager.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);

    // This will auto-refresh the Xero token if needed
    await getValidAccessToken(session.userId);

    // Issue a new session JWT (extends the session)
    const newSessionToken = await storeTokens(
      session.userId,
      session.tenantId,
      session.organisationName,
      // We need the current tokens - getValidAccessToken already refreshed if needed
      // Re-read from DB to get the latest
      await (async () => {
        const { createClient } = await import(
          "https://esm.sh/@supabase/supabase-js@2"
        );
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data } = await supabase
          .from("tokens")
          .select("*")
          .eq("user_id", session.userId)
          .single();
        if (!data) throw new Error("No tokens found");
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: Math.floor(
            (new Date(data.access_token_expires_at).getTime() - Date.now()) /
              1000,
          ),
          token_type: "Bearer",
          scope: "",
        };
      })(),
    );

    return jsonResponse({ session_token: newSessionToken });
  } catch (err) {
    console.error("Auth refresh error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      401,
    );
  }
});
