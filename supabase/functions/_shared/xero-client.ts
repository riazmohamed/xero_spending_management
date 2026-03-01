import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken } from "./token-manager.ts";
import type { CacheRecord } from "./types.ts";

const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";
const XERO_FINANCE_API_BASE = "https://api.xero.com/finance.xro/1.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

interface XeroRequestOptions {
  method?: string;
  body?: unknown;
  contentType?: string;
  rawBody?: Uint8Array;
}

export async function xeroFetch(
  userId: string,
  endpoint: string,
  options: XeroRequestOptions = {},
): Promise<Response> {
  const { accessToken, tenantId } = await getValidAccessToken(userId);
  const { method = "GET", body, contentType, rawBody } = options;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "xero-tenant-id": tenantId,
    Accept: "application/json",
  };

  let fetchBody: BodyInit | undefined;

  if (rawBody) {
    headers["Content-Type"] = contentType || "application/octet-stream";
    fetchBody = rawBody;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : endpoint.startsWith("/finance/")
      ? `${XERO_FINANCE_API_BASE}${endpoint.slice(8)}`
      : `${XERO_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  });

  if (response.status === 401) {
    throw new Error("XERO_UNAUTHORIZED");
  }

  if (response.status === 429) {
    throw new Error("XERO_RATE_LIMITED");
  }

  return response;
}

export async function cachedXeroFetch(
  userId: string,
  endpoint: string,
  cacheKey: string,
  cacheDurationSeconds: number,
): Promise<unknown> {
  const supabase = getSupabase();

  // Check cache first
  const { data: cached } = await supabase
    .from("cache")
    .select("*")
    .eq("key", cacheKey)
    .single();

  if (cached) {
    const record = cached as CacheRecord;
    if (new Date(record.expires_at) > new Date()) {
      return record.value;
    }
    // Cache expired, delete it
    await supabase.from("cache").delete().eq("key", cacheKey);
  }

  // Fetch from Xero
  const response = await xeroFetch(userId, endpoint);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Xero API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Store in cache
  const expiresAt = new Date(
    Date.now() + cacheDurationSeconds * 1000,
  ).toISOString();

  await supabase.from("cache").upsert(
    { key: cacheKey, value: data, expires_at: expiresAt },
    { onConflict: "key" },
  );

  return data;
}
