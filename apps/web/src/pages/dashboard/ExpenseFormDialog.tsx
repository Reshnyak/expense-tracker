import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  useCreateExpense,
  useUpdateExpense,
} from "@/features/expenses/useExpenses";
import type { Category, Expense, ExpenseInput, SpaceMember } from "@/shared/api/types";
import { centsToAmountInput, parseAmountToCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const NO_CATEGORY = "none";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  spaceId: string;
  members: SpaceMember[];
  categories: Category[];
  defaultPayerId?: string;
  mode: "create" | "edit";
  expense?: Expense;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function ExpenseFormDialog({
  spaceId,
  members,
  categories,
  defaultPayerId,
  mode,
  expense,
  open,
  onOpenChange,
  children,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const create = useCreateExpense(spaceId);
  const update = useUpdateExpense(spaceId);
  const pending = create.isPending || update.isPending;

  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [spentAt, setSpentAt] = useState(today());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset the form to the current subject each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (mode === "edit" && expense) {
      setAmount(centsToAmountInput(expense.amount_cents));
      setPayerId(expense.payer_id);
      setCategoryId(expense.category_id ?? NO_CATEGORY);
      setSpentAt(expense.spent_at);
      setDescription(expense.description ?? "");
    } else {
      setAmount("");
      setPayerId(defaultPayerId ?? members[0]?.user_id ?? "");
      setCategoryId(NO_CATEGORY);
      setSpentAt(today());
      setDescription("");
    }
  }, [isOpen, mode, expense, defaultPayerId, members]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError("Введите сумму больше нуля.");
      return;
    }
    if (!payerId) {
      setError("Выберите, кто платил.");
      return;
    }
    setError(null);

    const input: ExpenseInput = {
      payer_id: payerId,
      amount_cents: cents,
      spent_at: spentAt,
      category_id: categoryId === NO_CATEGORY ? undefined : categoryId,
      description: description.trim() || undefined,
    };

    const onSuccess = () => setOpen(false);
    const onError = () => setError("Не удалось сохранить расход. Попробуйте позже.");

    if (mode === "edit" && expense) {
      update.mutate({ id: expense.id, input }, { onSuccess, onError });
    } else {
      create.mutate(input, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Изменить расход" : "Новый расход"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="exp-amount">Сумма</Label>
              <Input
                id="exp-amount"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0,00"
                aria-invalid={error ? true : undefined}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="exp-date">Дата</Label>
              <Input
                id="exp-date"
                type="date"
                value={spentAt}
                max={today()}
                onChange={(e) => setSpentAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-payer">Кто платил</Label>
            <Select value={payerId} onValueChange={setPayerId}>
              <SelectTrigger id="exp-payer" className="w-full">
                <SelectValue placeholder="Выберите участника" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.user.name || m.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-category">Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="exp-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Без категории</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ${c.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-description">Описание</Label>
            <Input
              id="exp-description"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ужин в кафе"
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
