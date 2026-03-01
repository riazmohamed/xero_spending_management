import { useAuthStore } from "../stores/authStore";

// Set this to your Supabase project URL
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const BASE_URL = `${SUPABASE_URL}/functions/v1`;

async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const session = useAuthStore.getState().session;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    ...(options.headers as Record<string, string>),
  };

  if (session?.sessionToken) {
    headers["Authorization"] = `Bearer ${session.sessionToken}`;
  }

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired — clear and force re-login
    await useAuthStore.getState().clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  return response;
}

export async function apiGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const searchParams = params ? `?${new URLSearchParams(params)}` : "";
  const response = await apiFetch(`${endpoint}${searchParams}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const session = useAuthStore.getState().session;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
  };
  if (session?.sessionToken) {
    headers["Authorization"] = `Bearer ${session.sessionToken}`;
  }

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || `Upload failed: ${response.status}`);
  }
  return response.json();
}
