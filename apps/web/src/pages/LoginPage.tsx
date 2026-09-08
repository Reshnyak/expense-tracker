import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/shared/auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Placeholder login screen. The "Continue with Google" button kicks off the
 * server-side OAuth flow; the callback is expected to redirect back with tokens
 * in the query string (wire this up when the backend endpoints are implemented).
 */
export function LoginPage() {
  const { isAuthenticated, loginWithTokens } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    if (access && refresh) {
      loginWithTokens(access, refresh);
      navigate("/spaces", { replace: true });
    }
  }, [params, loginWithTokens, navigate]);

  useEffect(() => {
    if (isAuthenticated) navigate("/spaces", { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Expence Tracker</h1>
        <p className="mt-2 text-sm text-gray-500">Shared expense journal</p>
        <a
          href={`${API_BASE}/v1/auth/google/login`}
          className="mt-6 inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
}
