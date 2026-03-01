import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { apiPost } from "./api";
import type { AuthSession as AuthSessionType } from "../types";

WebBrowser.maybeCompleteAuthSession();

const XERO_CLIENT_ID = process.env.EXPO_PUBLIC_XERO_CLIENT_ID || "";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions",
  "accounting.attachments",
  "accounting.settings.read",
  "finance.bankstatementsplus.read",
  "offline_access",
];

const redirectUri = Platform.OS === "web"
  ? window.location.origin
  : AuthSession.makeRedirectUri({ scheme: "xero-spending" });

console.log("OAuth redirect URI:", redirectUri);

// Keys for storing PKCE verifier across page reloads (web only)
const VERIFIER_KEY = "xero_code_verifier";

function generateCodeVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function exchangeCodeForSession(
  code: string,
  codeVerifier: string,
): Promise<AuthSessionType> {
  const BASE_URL = `${SUPABASE_URL}/functions/v1`;
  console.log("Exchanging code for session...");

  const response = await fetch(`${BASE_URL}/auth-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Token exchange failed" }));
    console.error("Token exchange failed:", error);
    throw new Error(error.error || "Token exchange failed");
  }

  const data = await response.json();
  console.log("Auth success:", data.organisation_name);

  return {
    sessionToken: data.session_token,
    organisationName: data.organisation_name,
    tenantId: data.tenant_id,
  };
}

/**
 * On web, check if we're returning from a Xero redirect with a code in the URL.
 * Returns the auth session if found, null otherwise.
 */
export async function checkWebRedirect(): Promise<AuthSessionType | null> {
  if (Platform.OS !== "web") return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);

  if (!code || !codeVerifier) return null;

  // Clean up URL and stored verifier
  sessionStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState({}, "", window.location.origin);

  console.log("Found auth code in URL, exchanging...");
  return exchangeCodeForSession(code, codeVerifier);
}

export async function loginWithXero(): Promise<AuthSessionType> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const state = Crypto.getRandomBytes(16).reduce(
    (s, b) => s + b.toString(16).padStart(2, "0"),
    "",
  );

  const authUrl =
    `${XERO_AUTH_URL}?` +
    new URLSearchParams({
      response_type: "code",
      client_id: XERO_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: XERO_SCOPES.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    }).toString();

  // On web: store verifier in sessionStorage, then redirect (full page)
  if (Platform.OS === "web") {
    sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
    window.location.href = authUrl;
    // Won't return — page navigates away
    return new Promise(() => {});
  }

  // On mobile: use popup-style auth session
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !result.url) {
    throw new Error("Authentication was cancelled or failed");
  }

  const url = new URL(result.url);
  const code = url.searchParams.get("code");

  if (!code) {
    const error =
      url.searchParams.get("error_description") || "No code received";
    throw new Error(error);
  }

  return exchangeCodeForSession(code, codeVerifier);
}

export async function logout(): Promise<void> {
  try {
    await apiPost("auth-logout");
  } catch {
    // Best effort — still clear local session
  }
}
