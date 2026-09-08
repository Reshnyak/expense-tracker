import { getAccessToken, setTokens, clearTokens, getRefreshToken } from "@/shared/auth/tokenStore";
import type { ApiError, TokenPair } from "./types";

/** Base path for every API call. Application code passes paths like `/v1/...`. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
  ) {
    super(body?.message ?? `HTTP ${status}`);
    this.name = "HttpError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** internal: prevents infinite refresh recursion */
  _retry?: boolean;
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401 && !opts._retry && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) return rawRequest<T>(path, { ...opts, _retry: true });
    clearTokens();
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new HttpError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: getRefreshToken() }),
      });
      if (!res.ok) return false;
      const pair = (await res.json()) as TokenPair;
      setTokens(pair.access_token, pair.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => rawRequest<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => rawRequest<T>(path, { method: "DELETE" }),
};
