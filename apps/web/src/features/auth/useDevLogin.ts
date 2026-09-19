import { useMutation } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { DevLoginInput, TokenPair } from "@/shared/api/types";

/**
 * Local-only shortcut: mints a token pair for an email via
 * `POST /v1/auth/dev-login` (returns 404 when the server is not in local env).
 * The caller feeds the resulting pair into `useAuth().loginWithTokens`.
 */
export function useDevLogin() {
  return useMutation({
    mutationFn: (input: DevLoginInput) => api.post<TokenPair>("/v1/auth/dev-login", input),
  });
}
