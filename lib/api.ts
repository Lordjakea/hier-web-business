import {
  getAuthToken,
  redirectToLoginExpired,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizeBaseUrl(raw?: string | null): string {
  const value = (raw || "").trim().replace(/\/$/, "");
  return value || "http://127.0.0.1:5000";
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL
);

export function resolveApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  const p = payload as { msg?: string; error?: string; message?: string };
  const raw = String(p?.msg || p?.error || p?.message || fallback || "Request failed");

  const lower = raw.toLowerCase();

  if (
    lower.includes("token expired") ||
    lower.includes("expired token") ||
    lower.includes("signature has expired") ||
    lower.includes("jwt expired")
  ) {
    return SESSION_EXPIRED_MESSAGE;
  }

  return raw;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = getApiErrorMessage(
      payload,
      response.statusText || "Request failed"
    );

    if (response.status === 401 && message === SESSION_EXPIRED_MESSAGE) {
      redirectToLoginExpired();
    }

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}