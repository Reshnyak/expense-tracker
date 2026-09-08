import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { Space, SpaceInput } from "@/shared/api/types";

const KEY = ["spaces"] as const;

export function useSpaces() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => api.get<Space[]>("/v1/spaces", signal),
  });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SpaceInput) => api.post<Space>("/v1/spaces", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
