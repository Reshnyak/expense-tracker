import { useMutation } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { LoginInput, TokenPair } from "@/shared/api/types";

/**
 * Email + password sign-in via `POST /v1/auth/login`. The caller feeds the
 * resulting pair into `useAuth().loginWithTokens`.
 */
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<TokenPair>("/v1/auth/login", input),
  });
}
