import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { Balance, Expense, ExpenseInput, ExpenseList } from "@/shared/api/types";

const listKey = (spaceId: string) => ["spaces", spaceId, "expenses"] as const;
const balanceKey = (spaceId: string) => ["spaces", spaceId, "balances"] as const;

/** The backend has no working cursor pagination yet, so we pull one generous
 * page and paginate on the client. `from` / `to` are inclusive `YYYY-MM-DD`. */
const MAX_ROWS = 200;

export interface ExpenseFilters {
  from?: string;
  to?: string;
}

export function useExpenses(spaceId: string, filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: [...listKey(spaceId), filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ limit: String(MAX_ROWS) });
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      return api.get<ExpenseList>(
        `/v1/spaces/${spaceId}/expenses?${params.toString()}`,
        signal,
      );
    },
    enabled: !!spaceId,
  });
}

export function useBalances(spaceId: string) {
  return useQuery({
    queryKey: balanceKey(spaceId),
    queryFn: ({ signal }) => api.get<Balance[]>(`/v1/spaces/${spaceId}/balances`, signal),
    enabled: !!spaceId,
  });
}

function invalidateSpace(
  qc: ReturnType<typeof useQueryClient>,
  spaceId: string,
) {
  void qc.invalidateQueries({ queryKey: listKey(spaceId) });
  void qc.invalidateQueries({ queryKey: balanceKey(spaceId) });
}

export function useCreateExpense(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      api.post<Expense>(`/v1/spaces/${spaceId}/expenses`, input),
    onSuccess: () => invalidateSpace(qc, spaceId),
  });
}

export function useUpdateExpense(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      api.patch<Expense>(`/v1/spaces/${spaceId}/expenses/${id}`, input),
    onSuccess: () => invalidateSpace(qc, spaceId),
  });
}

export function useDeleteExpense(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/v1/spaces/${spaceId}/expenses/${id}`),
    onSuccess: () => invalidateSpace(qc, spaceId),
  });
}
