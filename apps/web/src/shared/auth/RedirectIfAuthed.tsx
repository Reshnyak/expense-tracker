import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { sanitizeRedirect } from "./redirect";

interface FromState {
  from?: { pathname?: string };
}

/**
 * Inverse of {@link RequireAuth}: keeps already-authenticated users off the
 * /login and /register pages, sending them to wherever they were headed
 * (`location.state.from`) or to /spaces.
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-6 text-gray-500">Загрузка…</div>;
  }
  if (isAuthenticated) {
    const from = (location.state as FromState | null)?.from?.pathname;
    return <Navigate to={sanitizeRedirect(from)} replace />;
  }
  return <>{children}</>;
}
