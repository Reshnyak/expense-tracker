import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, HttpError } from "@/shared/api/http";
import type { TokenPair } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function LoginPage() {
  const { isAuthenticated, loginWithTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/spaces", { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Expence Tracker</h1>
        <p className="mt-2 text-sm text-gray-500">Shared expense journal</p>
        <a
          href={`${API_BASE}/v1/auth/google/login?redirect_uri=${encodeURIComponent("/spaces")}`}
          className="mt-6 inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Continue with Google
        </a>
        {import.meta.env.DEV && <DevLogin onTokens={loginWithTokens} />}
      </div>
    </div>
  );
}

/** Local-only shortcut: mints tokens for any email via POST /v1/auth/dev-login. */
function DevLogin({ onTokens }: { onTokens: (access: string, refresh: string) => void }) {
  const [email, setEmail] = useState("dev@example.com");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pair = await api.post<TokenPair>("/v1/auth/dev-login", { email });
      onTokens(pair.access_token, pair.refresh_token);
    } catch (err) {
      setError(
        err instanceof HttpError && err.status === 404
          ? "dev-login is disabled (server not in local env)"
          : "dev-login failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-gray-100 pt-4 text-left">
      <label className="text-xs font-medium text-gray-500">Dev login (local only)</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-2 w-full rounded-md border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Sign in as this email
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
