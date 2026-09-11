import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { MemberRole, SpaceMember } from "@/shared/api/types";

const key = (spaceId: string) => ["spaces", spaceId, "members"] as const;
const balanceKey = (spaceId: string) => ["spaces", spaceId, "balances"] as const;

export function useMembers(spaceId: string) {
  return useQuery({
    queryKey: key(spaceId),
    queryFn: ({ signal }) =>
      api.get<SpaceMember[]>(`/v1/spaces/${spaceId}/members`, signal),
    enabled: !!spaceId,
  });
}

export interface AddMemberInput {
  email: string;
  role?: MemberRole;
}

export function useAddMember(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMemberInput) =>
      api.post<SpaceMember>(`/v1/spaces/${spaceId}/members`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(spaceId) });
      void qc.invalidateQueries({ queryKey: balanceKey(spaceId) });
    },
  });
}
