import { useMutation } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { RegisterInput, TokenPair } from "@/shared/api/types";

/**
 * Create a local account via `POST /v1/auth/register` (a duplicate email is a
 * 409). On success the server returns a token pair — the account is signed in
 * immediately.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<TokenPair>("/v1/auth/register", input),
  });
}
