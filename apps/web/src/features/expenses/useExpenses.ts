import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api/http";
import type { Balance, Expense, ExpenseInput, ExpenseList } from "@/shared/api/types";

const listKey = (spaceId: string) => ["spaces", spaceId, "expenses"] as const;
const balanceKey = (spaceId: string) => ["spaces", spaceId, "balances"] as const;

export function useExpenses(spaceId: string) {
  return useQuery({
    queryKey: listKey(spaceId),
    queryFn: ({ signal }) =>
      api.get<ExpenseList>(`/v1/spaces/${spaceId}/expenses`, signal),
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

export function useCreateExpense(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      api.post<Expense>(`/v1/spaces/${spaceId}/expenses`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: listKey(spaceId) });
      void qc.invalidateQueries({ queryKey: balanceKey(spaceId) });
    },
  });
}
