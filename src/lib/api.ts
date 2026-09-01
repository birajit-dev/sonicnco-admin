import type { ApiResult } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

const TOKEN_KEY = "snc_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

export async function api<T>(path: string, { method = "GET", body }: Options = {}): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Omit cookies so admin never shares / overwrites the artist frontend session.
      credentials: "omit",
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await res.json() : null;

    if (!res.ok) {
      const err = payload as { error?: string; message?: string } | null;
      return {
        ok: false,
        error: err?.error ?? err?.message ?? `Request failed (${res.status})`,
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: "Could not reach the API. Is it running on :8080?" };
  }
}

/** Fetch agreement PDF and open in a new tab (admin download/view). */
export async function openAgreementDocument(agreementId: string): Promise<ApiResult<true>> {
  try {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/agreements/${agreementId}/document`, {
      headers,
      credentials: "omit",
    });
    if (!res.ok) {
      return { ok: false, error: "Could not load agreement document." };
    }
    const contentType = res.headers.get("content-type") ?? "application/pdf";
    const blob = await res.blob();
    const url = URL.createObjectURL(new Blob([blob], { type: contentType }));
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true, data: true };
  } catch {
    return { ok: false, error: "Could not open agreement document." };
  }
}
