import { useParams } from "react-router-dom";

import { useBalances, useExpenses } from "@/features/expenses/useExpenses";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export function ExpensesPage() {
  const { spaceId = "" } = useParams();
  const { data: list, isLoading } = useExpenses(spaceId);
  const { data: balances } = useBalances(spaceId);

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Расходы</h2>

      {isLoading && <p className="text-gray-500">Загрузка…</p>}

      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        {list?.items.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-4 py-3">
            <span>{e.description ?? "(без описания)"}</span>
            <span className="tabular-nums">{formatCents(e.amount_cents, e.currency)}</span>
          </li>
        ))}
        {list?.items.length === 0 && (
          <li className="px-4 py-3 text-gray-500">Пока нет расходов.</li>
        )}
      </ul>

      {balances && balances.length > 0 && (
        <div>
          <h3 className="font-medium">Баланс</h3>
          <ul className="mt-2 text-sm">
            {balances.map((b) => (
              <li key={b.user_id} className="tabular-nums">
                {b.user_id.slice(0, 8)}: {b.net_cents >= 0 ? "+" : ""}
                {(b.net_cents / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
