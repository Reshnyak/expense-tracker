import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { UpdateMeInput, User } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";

/** PATCH /v1/me, then refresh the auth user and any loaded member lists
 * (member cards embed the same user object). */
export function useUpdateMe() {
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (input: UpdateMeInput) => api.patch<User>("/v1/me", input),
    onSuccess: async () => {
      await refreshUser();
      void qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "spaces" && q.queryKey[2] === "members",
      });
    },
  });
}
