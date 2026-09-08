/**
 * Token persistence. localStorage keeps the user signed in across reloads; swap
 * for an in-memory + httpOnly-cookie scheme later if you want stricter XSS posture.
 */
const ACCESS_KEY = "et.access_token";
const REFRESH_KEY = "et.refresh_token";

type Listener = () => void;
const listeners = new Set<Listener>();

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore (private mode / disabled storage) */
  }
}

export function getAccessToken(): string | null {
  return safeGet(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  safeSet(ACCESS_KEY, access);
  safeSet(REFRESH_KEY, refresh);
  listeners.forEach((l) => l());
}

export function clearTokens() {
  safeSet(ACCESS_KEY, null);
  safeSet(REFRESH_KEY, null);
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
