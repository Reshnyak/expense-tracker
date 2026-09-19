import { useMemo } from "react";

import type { Balance, Category, Expense, SpaceMember } from "@/shared/api/types";
import { cn } from "@/shared/lib/utils";
import { formatCents } from "@/shared/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

const UNCATEGORIZED = "__none__";

export function BalancesCard({
  balances,
  members,
  expenses,
  categories,
  currency,
  filtered,
}: {
  balances: Balance[];
  members: SpaceMember[];
  expenses: Expense[];
  categories: Category[];
  currency: string;
  /** Whether `expenses` is narrowed by a date filter — `balances` (and the
   * header total below) never is, so the two totals in this card can land on
   * different scopes; when true we label the category breakdown accordingly
   * instead of implying it must add up to the header figure. */
  filtered: boolean;
}) {
  const nameOf = (userId: string) => {
    const m = members.find((x) => x.user_id === userId);
    return m ? m.user.name || m.user.email : `${userId.slice(0, 8)}…`;
  };

  const totalPaid = balances.reduce((sum, b) => sum + b.paid_cents, 0);
  const splitEnabled = members.length > 1;

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      const key = e.category_id ?? UNCATEGORIZED;
      totals.set(key, (totals.get(key) ?? 0) + e.amount_cents);
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    return {
      sum,
      rows: [...totals.entries()]
        .map(([key, cents]) => {
          const cat = key === UNCATEGORIZED ? null : (categories.find((c) => c.id === key) ?? null);
          return {
            key,
            label: cat ? cat.name : "Без категории",
            icon: cat?.icon ?? null,
            color: cat?.color ?? null,
            cents,
            pct: sum > 0 ? Math.round((cents / sum) * 100) : 0,
          };
        })
        .sort((a, b) => b.cents - a.cents),
    };
  }, [expenses, categories]);

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between gap-2">
        <CardTitle className="text-base">Балансы</CardTitle>
        <span className="text-muted-foreground text-sm">
          Всего потрачено (за всё время){" "}
          <span className="text-foreground tabular-nums font-medium">
            {formatCents(totalPaid, currency)}
          </span>
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.length === 0 ? (
          <p className="text-muted-foreground text-sm">Расходов пока нет.</p>
        ) : (
          <>
            <ul className="divide-y">
              {balances.map((b) => {
                const owed = b.net_cents > 0;
                const settled = b.net_cents === 0;
                return (
                  <li
                    key={b.user_id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{nameOf(b.user_id)}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        внёс(ла) {formatCents(b.paid_cents, currency)}
                        {splitEnabled && ` · доля ${formatCents(b.share_cents, currency)}`}
                      </span>
                    </span>
                    {splitEnabled && (
                      <span className="flex shrink-0 flex-col items-end">
                        <span
                          className={cn(
                            "tabular-nums font-semibold",
                            settled && "text-muted-foreground",
                            owed && "text-resin",
                            !owed && !settled && "text-destructive",
                          )}
                        >
                          {owed ? "+" : ""}
                          {formatCents(b.net_cents, currency)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {settled ? "в расчёте" : owed ? "должны вернуть" : "нужно доплатить"}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {!splitEnabled && (
              <p className="text-muted-foreground text-xs">
                Пригласите участников, чтобы делить расходы поровну.
              </p>
            )}

            {byCategory.rows.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-muted-foreground text-xs font-medium">
                      По категориям ({filtered ? "за выбранный период" : "за всё время"})
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatCents(byCategory.sum, currency)}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {byCategory.rows.map((r) => (
                      <li key={r.key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <svg
                              aria-hidden
                              viewBox="0 0 24 24"
                              className="size-2.5 shrink-0"
                              style={{ fill: r.color ?? "var(--muted-foreground)" }}
                            >
                              <path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z" />
                            </svg>
                            <span className="truncate">
                              {r.icon ? `${r.icon} ` : ""}
                              {r.label}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            {formatCents(r.cents, currency)} · {r.pct}%
                          </span>
                        </div>
                        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.pct}%`,
                              background: r.color ?? "var(--muted-foreground)",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
