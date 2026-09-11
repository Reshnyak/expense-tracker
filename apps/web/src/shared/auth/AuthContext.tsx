import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api } from "@/shared/api/http";
import type { User } from "@/shared/api/types";
import { clearTokens, getAccessToken, setTokens, subscribe } from "./tokenStore";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithTokens: (access: string, refresh: string) => void;
  logout: () => void;
  /** Re-fetch `GET /v1/me` (e.g. after the user edits their profile). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState<boolean>(!!getAccessToken());

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUser(await api.get<User>("/v1/me"));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch the user WITHOUT touching the app-wide `isLoading` gate.
  // `isLoading` is what `RequireAuth` uses to decide whether to unmount the
  // whole authenticated app behind a full-page spinner — appropriate for the
  // initial "are we signed in?" check, but not for a background refresh like
  // "the user just edited their own profile".
  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      setUser(await api.get<User>("/v1/me"));
    } catch {
      // keep the previously loaded user on a transient failure
    }
  }, []);

  useEffect(() => {
    void refreshMe();
    return subscribe(() => void refreshMe());
  }, [refreshMe]);

  const loginWithTokens = useCallback(
    (access: string, refresh: string) => setTokens(access, refresh),
    [],
  );

  const logout = useCallback(() => {
    void api.post("/v1/auth/logout").catch(() => undefined);
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      loginWithTokens,
      logout,
      refreshUser,
    }),
    [user, isLoading, loginWithTokens, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
