import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { Category, CategoryInput } from "@/shared/api/types";

const key = (spaceId: string) => ["spaces", spaceId, "categories"] as const;

export function useCategories(spaceId: string) {
  return useQuery({
    queryKey: key(spaceId),
    queryFn: ({ signal }) =>
      api.get<Category[]>(`/v1/spaces/${spaceId}/categories`, signal),
    enabled: !!spaceId,
  });
}

export function useCreateCategory(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      api.post<Category>(`/v1/spaces/${spaceId}/categories`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(spaceId) }),
  });
}
