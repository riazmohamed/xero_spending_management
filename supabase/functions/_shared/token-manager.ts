import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { TokenRecord, XeroTokenResponse, SessionPayload } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Simple JWT implementation for Deno
async function createJWT(payload: SessionPayload): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${data}.${sigB64}`;
}

export async function verifyJWT(token: string): Promise<SessionPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data),
  );
  if (!valid) throw new Error("Invalid token signature");

  const payload: SessionPayload = JSON.parse(
    atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
  );

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}

export async function storeTokens(
  userId: string,
  tenantId: string,
  organisationName: string | null,
  xeroTokens: XeroTokenResponse,
): Promise<string> {
  const supabase = getSupabase();
  const now = new Date();
  const accessExpiry = new Date(now.getTime() + xeroTokens.expires_in * 1000);
  // Xero refresh tokens expire after 60 days
  const refreshExpiry = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const record: Omit<TokenRecord, "created_at"> = {
    user_id: userId,
    tenant_id: tenantId,
    access_token: xeroTokens.access_token,
    refresh_token: xeroTokens.refresh_token,
    access_token_expires_at: accessExpiry.toISOString(),
    refresh_token_expires_at: refreshExpiry.toISOString(),
    organisation_name: organisationName,
    updated_at: now.toISOString(),
  };

  const { error } = await supabase
    .from("tokens")
    .upsert(record, { onConflict: "user_id" });

  if (error) throw new Error(`Failed to store tokens: ${error.message}`);

  // Create session JWT (valid for 24 hours)
  const sessionPayload: SessionPayload = {
    userId,
    tenantId,
    organisationName,
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  return createJWT(sessionPayload);
}

export async function getValidAccessToken(userId: string): Promise<{ accessToken: string; tenantId: string }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) throw new Error("No tokens found for user");

  const token = data as TokenRecord;
  const now = new Date();
  const expiresAt = new Date(token.access_token_expires_at);

  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return refreshAccessToken(userId, token);
  }

  return { accessToken: token.access_token, tenantId: token.tenant_id };
}

async function refreshAccessToken(
  userId: string,
  token: TokenRecord,
): Promise<{ accessToken: string; tenantId: string }> {
  const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID")!;

  const response = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
      client_id: XERO_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorBody}`);
  }

  const xeroTokens: XeroTokenResponse = await response.json();

  await storeTokens(
    userId,
    token.tenant_id,
    token.organisation_name,
    xeroTokens,
  );

  return { accessToken: xeroTokens.access_token, tenantId: token.tenant_id };
}

export async function deleteTokens(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("tokens")
    .delete()
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete tokens: ${error.message}`);
}

export async function extractSession(req: Request): Promise<SessionPayload> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }
  const token = authHeader.slice(7);
  return verifyJWT(token);
}
