export const AUTH_TOKEN_KEY = "hier_business_access_token";
export const AUTH_USER_KEY = "hier_business_user";
export const SESSION_EXPIRED_MESSAGE =
  "You’ve been idle for too long. Please log back in.";

export type StoredBusinessUser = {
  id?: number;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  email_verified?: boolean | null;
  is_staff?: boolean | null;
  staff_role?: string | null;
  avatar_url?: string | null;
  business_name?: string | null;
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): StoredBusinessUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredBusinessUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredBusinessUser | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function clearSession() {
  clearAuthToken();
  clearStoredUser();
}

export function redirectToLoginExpired() {
  if (typeof window === "undefined") return;

  clearSession();

  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("reason", "idle_timeout");

  window.location.href = loginUrl.toString();
}