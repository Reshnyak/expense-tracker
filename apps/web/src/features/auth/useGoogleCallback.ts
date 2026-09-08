import { useMutation } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { TokenPair } from "@/shared/api/types";

interface GoogleCallbackArgs {
  code: string;
  state: string;
}

/**
 * Hands the Google `code` + `state` to the backend, which performs the
 * server-side exchange and returns a token pair
 * (`GET /v1/auth/google/callback`).
 */
export function useGoogleCallback() {
  return useMutation({
    mutationFn: ({ code, state }: GoogleCallbackArgs) => {
      const qs = new URLSearchParams({ code, state }).toString();
      return api.get<TokenPair>(`/v1/auth/google/callback?${qs}`);
    },
  });
}
