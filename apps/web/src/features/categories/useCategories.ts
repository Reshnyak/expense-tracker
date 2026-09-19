import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { Category, CategoryInput } from "@/shared/api/types";

const key = (spaceId: string) => ["spaces", spaceId, "categories"] as const;
const expensesKey = (spaceId: string) => ["spaces", spaceId, "expenses"] as const;

export function useCategories(spaceId: string) {
  return useQuery({
    queryKey: key(spaceId),
    queryFn: ({ signal }) => api.get<Category[]>(`/v1/spaces/${spaceId}/categories`, signal),
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

export function useUpdateCategory(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      api.patch<Category>(`/v1/spaces/${spaceId}/categories/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(spaceId) });
      // an expense's category name/color is rendered from the categories list,
      // but keep the list query fresh in case a consumer joins on it
      void qc.invalidateQueries({ queryKey: expensesKey(spaceId) });
    },
  });
}

export function useDeleteCategory(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/spaces/${spaceId}/categories/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(spaceId) });
      // deleting a category clears category_id on its expenses (ON DELETE SET NULL)
      void qc.invalidateQueries({ queryKey: expensesKey(spaceId) });
    },
  });
}
