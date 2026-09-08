/**
 * Post-authentication redirect handling, shared between the route guards and the
 * auth feature. Kept in `shared` so nothing here depends on a higher layer.
 */

/** Where to send the user when no specific destination was requested. */
export const DEFAULT_REDIRECT = "/spaces";

/** sessionStorage key holding the same-site path to land on after OAuth. */
const REDIRECT_KEY = "et.postLoginRedirect";

/** Keep only safe same-site paths ("/foo/bar"); anything else falls back. */
export function sanitizeRedirect(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }
  return path;
}

/**
 * Persist the post-login destination before a full-page navigation to the OAuth
 * provider (the round-trip drops React Router's in-memory location state).
 */
export function rememberPostLoginRedirect(path: string): void {
  try {
    window.sessionStorage.setItem(REDIRECT_KEY, sanitizeRedirect(path));
  } catch {
    // sessionStorage unavailable (private mode) — the callback falls back.
  }
}

/** Read and clear the stored post-login path; falls back to DEFAULT_REDIRECT. */
export function consumePostLoginRedirect(): string {
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(REDIRECT_KEY);
    window.sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    // ignore
  }
  return sanitizeRedirect(stored);
}
