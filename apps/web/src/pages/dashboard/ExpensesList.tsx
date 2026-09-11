import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { useDeleteExpense } from "@/features/expenses/useExpenses";
import type { Category, Expense, SpaceMember } from "@/shared/api/types";
import { formatCents } from "@/shared/lib/money";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { ExpenseFormDialog } from "./ExpenseFormDialog";

function formatDate(spentAt: string): string {
  const [y, m, d] = spentAt.split("-");
  return d && m && y ? `${d}.${m}.${y}` : spentAt;
}

interface ListProps {
  spaceId: string;
  expenses: Expense[];
  members: SpaceMember[];
  categories: Category[];
  currency: string;
}

export function ExpensesList({
  spaceId,
  expenses,
  members,
  categories,
  currency,
}: ListProps) {
  if (expenses.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
        Расходов пока нет.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {expenses.map((e) => (
        <ExpenseRow
          key={e.id}
          spaceId={spaceId}
          expense={e}
          members={members}
          categories={categories}
          currency={currency}
        />
      ))}
    </ul>
  );
}

function ExpenseRow({
  spaceId,
  expense,
  members,
  categories,
  currency,
}: {
  spaceId: string;
  expense: Expense;
  members: SpaceMember[];
  categories: Category[];
  currency: string;
}) {
  const del = useDeleteExpense(spaceId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const payer = members.find((m) => m.user_id === expense.payer_id);
  const payerName = payer ? payer.user.name || payer.user.email : "—";
  const category = categories.find((c) => c.id === expense.category_id);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDate(expense.spent_at)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate">
            {expense.description || <span className="text-muted-foreground">Без описания</span>}
          </span>
          {category && (
            <Badge
              variant="outline"
              className="shrink-0 gap-1"
              style={
                category.color
                  ? { borderColor: category.color, color: category.color }
                  : undefined
              }
            >
              {category.icon ? <span>{category.icon}</span> : null}
              {category.name}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground truncate text-xs">{payerName}</div>
      </div>
      <div className="shrink-0 tabular-nums font-medium">
        {formatCents(expense.amount_cents, expense.currency || currency)}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Действия с расходом">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Изменить
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseFormDialog
        spaceId={spaceId}
        members={members}
        categories={categories}
        mode="edit"
        expense={expense}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (open) setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить расход?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatCents(expense.amount_cents, expense.currency || currency)}
              {expense.description ? ` · ${expense.description}` : ""}. Действие
              необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-destructive text-sm">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={(e) => {
                // Keep the dialog open until we know the outcome — Radix
                // closes it on click by default unless we prevent that.
                e.preventDefault();
                setDeleteError(null);
                del.mutate(expense.id, {
                  onSuccess: () => setDeleteOpen(false),
                  onError: () =>
                    setDeleteError("Не удалось удалить расход. Попробуйте позже."),
                });
              }}
            >
              {del.isPending ? "Удаляем…" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
