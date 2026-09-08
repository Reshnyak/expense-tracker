import { API_BASE_URL } from "@/shared/api/http";
import {
  DEFAULT_REDIRECT,
  rememberPostLoginRedirect,
  sanitizeRedirect,
} from "@/shared/auth/redirect";

/** Build the backend URL that starts the Google consent flow. */
export function googleLoginUrl(redirectPath: string = DEFAULT_REDIRECT): string {
  const safe = sanitizeRedirect(redirectPath);
  return `${API_BASE_URL}/v1/auth/google/login?redirect_uri=${encodeURIComponent(safe)}`;
}

/**
 * Persist the post-login destination and hand the browser to Google.
 * Full-page navigation on purpose.
 */
export function startGoogleLogin(redirectPath: string = DEFAULT_REDIRECT): void {
  const safe = sanitizeRedirect(redirectPath);
  rememberPostLoginRedirect(safe);
  window.location.assign(googleLoginUrl(safe));
}

export interface OAuthCallbackParams {
  code: string | null;
  state: string | null;
  error: string | null;
}

/** Pull the OAuth result out of the callback URL's query string. */
export function readCallbackParams(params: URLSearchParams): OAuthCallbackParams {
  return {
    code: params.get("code"),
    state: params.get("state"),
    error: params.get("error"),
  };
}

/**
 * Turn a provider error code into a user-facing message. Never surfaces raw
 * provider/backend text.
 */
export function describeOAuthError(code: string | null): string {
  if (code === "access_denied") {
    return "Вы отменили вход через Google. Попробуйте снова, когда будете готовы.";
  }
  return "Не удалось войти через Google. Попробуйте ещё раз.";
}
