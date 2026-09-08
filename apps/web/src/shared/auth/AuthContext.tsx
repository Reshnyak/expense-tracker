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
    }),
    [user, isLoading, loginWithTokens, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
