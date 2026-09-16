import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Plus, Tags } from "lucide-react";

import { useCategories } from "@/features/categories/useCategories";
import type { ExpenseFilters } from "@/features/expenses/useExpenses";
import { MAX_ROWS, useBalances, useExpenses } from "@/features/expenses/useExpenses";
import { useMembers } from "@/features/members/useMembers";
import { useSpaces } from "@/features/spaces/useSpaces";
import { useAuth } from "@/shared/auth/AuthContext";
import { setLastSpaceId } from "@/shared/lib/lastSpace";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { BalancesCard } from "./dashboard/BalancesCard";
import { CategoryManagerDialog } from "./dashboard/CategoryManagerDialog";
import { DateRangeFilter } from "./dashboard/DateRangeFilter";
import { ExpenseFormDialog } from "./dashboard/ExpenseFormDialog";
import { ExpensesList } from "./dashboard/ExpensesList";
import { MembersBar } from "./dashboard/MembersBar";
import { Pagination } from "./dashboard/Pagination";

const PAGE_SIZE = 10;

export function DashboardPage() {
  const { spaceId = "" } = useParams();
  const { user } = useAuth();

  const { data: spaces, isLoading: spacesLoading, error: spacesError } = useSpaces();
  const { data: members } = useMembers(spaceId);
  const { data: categories } = useCategories(spaceId);
  const { data: balances } = useBalances(spaceId);

  const [filters, setFilters] = useState<ExpenseFilters>({});
  const { data: list, isLoading: expensesLoading, error: expensesError } = useExpenses(
    spaceId,
    filters,
  );

  const [page, setPage] = useState(1);

  useEffect(() => {
    if (spaceId) setLastSpaceId(spaceId);
  }, [spaceId]);

  useEffect(() => {
    setPage(1);
  }, [spaceId, filters.from, filters.to]);

  const space = spaces?.find((s) => s.id === spaceId);
  const memberList = useMemo(() => members ?? [], [members]);
  const categoryList = useMemo(() => categories ?? [], [categories]);
  const items = list?.items ?? [];
  const isDateFiltered = Boolean(filters.from || filters.to);
  // We only ever fetch up to MAX_ROWS; hitting that cap means there may be
  // older expenses in range that were never fetched, not just off-screen.
  const truncated = items.length >= MAX_ROWS;
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = items.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (spacesLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Загрузка…
      </p>
    );
  }

  if (spacesError) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">Не удалось загрузить пространства.</p>
        <Button asChild variant="outline">
          <Link to="/spaces">Повторить</Link>
        </Button>
      </div>
    );
  }

  if (spaces && !space) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Пространство не найдено.</p>
        <Button asChild variant="outline">
          <Link to="/spaces">К списку пространств</Link>
        </Button>
      </div>
    );
  }

  const currency = space?.currency ?? "USD";

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-serif text-2xl font-semibold">{space?.name}</h1>
          <Badge variant="secondary">{currency}</Badge>
        </div>
        <MembersBar spaceId={spaceId} members={memberList} />
      </header>

      <BalancesCard
        balances={balances ?? []}
        members={memberList}
        expenses={items}
        categories={categoryList}
        currency={currency}
        filtered={isDateFiltered}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          <ExpenseFormDialog
            spaceId={spaceId}
            members={memberList}
            categories={categoryList}
            defaultPayerId={user?.id}
            mode="create"
          >
            <Button>
              <Plus className="size-4" />
              Добавить расход
            </Button>
          </ExpenseFormDialog>
          <CategoryManagerDialog spaceId={spaceId} categories={categoryList}>
            <Button variant="outline">
              <Tags className="size-4" />
              Категории
            </Button>
          </CategoryManagerDialog>
        </div>
        <DateRangeFilter value={filters} onChange={setFilters} />
      </div>

      {expensesLoading ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Загрузка…
        </p>
      ) : expensesError ? (
        <p className="text-destructive">Не удалось загрузить расходы.</p>
      ) : (
        <div className="space-y-4">
          {truncated && (
            <p className="text-muted-foreground text-xs">
              Показаны только последние {MAX_ROWS} расходов
              {isDateFiltered ? " за выбранный период" : ""} — более ранние
              могли не загрузиться. Сузьте диапазон дат «С» / «По», чтобы
              увидеть их.
            </p>
          )}
          <ExpensesList
            spaceId={spaceId}
            expenses={pageItems}
            members={memberList}
            categories={categoryList}
            currency={currency}
          />
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={items.length}
            onPage={setPage}
          />
        </div>
      )}
    </section>
  );
}
