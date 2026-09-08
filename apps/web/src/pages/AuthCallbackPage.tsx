import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api } from "@/shared/api/http";
import type { TokenPair } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";

/**
 * Google redirects here (see GOOGLE_OAUTH_REDIRECT_URL). We hand the `code` +
 * `state` to the backend, which exchanges them and returns a token pair.
 */
export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(`Google sign-in was cancelled (${oauthError}).`);
      return;
    }
    if (!code || !state) {
      setError("Missing authorization code.");
      return;
    }

    const qs = new URLSearchParams({ code, state }).toString();
    api
      .get<TokenPair>(`/v1/auth/google/callback?${qs}`)
      .then((pair) => {
        loginWithTokens(pair.access_token, pair.refresh_token);
        navigate("/spaces", { replace: true });
      })
      .catch(() => setError("Could not complete sign-in. Please try again."));
  }, [params, loginWithTokens, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <Link to="/login" className="mt-4 inline-block text-blue-600 hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-500">Signing you in…</p>
        )}
      </div>
    </div>
  );
}
