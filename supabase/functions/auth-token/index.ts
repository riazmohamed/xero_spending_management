import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { storeTokens } from "../_shared/token-manager.ts";
import type { XeroTokenResponse, XeroTenant } from "../_shared/types.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { code, code_verifier, redirect_uri } = await req.json();

    if (!code || !code_verifier || !redirect_uri) {
      return errorResponse("Missing code, code_verifier, or redirect_uri");
    }

    const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID")!;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      "https://identity.xero.com/connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: XERO_CLIENT_ID,
          code_verifier,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      return errorResponse(
        `Token exchange failed: ${errorBody}`,
        tokenResponse.status,
      );
    }

    const xeroTokens: XeroTokenResponse = await tokenResponse.json();

    // Get connected tenants
    const connectionsResponse = await fetch(
      "https://api.xero.com/connections",
      {
        headers: { Authorization: `Bearer ${xeroTokens.access_token}` },
      },
    );

    if (!connectionsResponse.ok) {
      return errorResponse("Failed to get Xero connections", 500);
    }

    const tenants: XeroTenant[] = await connectionsResponse.json();

    if (tenants.length === 0) {
      return errorResponse("No Xero organisations connected", 400);
    }

    // Use the first tenant (most users have one org)
    const tenant = tenants[0];

    // Generate a simple user ID from the tenant
    const userId = `xero_${tenant.tenantId}`;

    // Store tokens and get session JWT
    const sessionToken = await storeTokens(
      userId,
      tenant.tenantId,
      tenant.tenantName,
      xeroTokens,
    );

    return jsonResponse({
      session_token: sessionToken,
      organisation_name: tenant.tenantName,
      tenant_id: tenant.tenantId,
    });
  } catch (err) {
    console.error("Auth token error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
