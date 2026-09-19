import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateSpace } from "@/features/spaces/useSpaces";
import { setLastSpaceId } from "@/shared/lib/lastSpace";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const CURRENCIES = ["USD", "EUR", "RUB", "GBP", "KZT", "UAH", "PLN"];

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional trigger element. Omit when controlling `open` from the outside. */
  children?: ReactNode;
}

/** Dialog for creating a new space. Navigates to the new space on success. */
export function CreateSpaceDialog({ open, onOpenChange, children }: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const navigate = useNavigate();
  const create = useCreateSpace();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Укажите название.");
      return;
    }
    setError(null);
    create.mutate(
      { name: trimmed, currency },
      {
        onSuccess: (space) => {
          setLastSpaceId(space.id);
          setOpen(false);
          setName("");
          setCurrency("USD");
          navigate(`/spaces/${space.id}`);
        },
        onError: () => setError("Не удалось создать пространство. Попробуйте позже."),
      },
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое пространство</DialogTitle>
          <DialogDescription>
            Общий журнал расходов для группы. Валюту потом не изменить.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-name">Название</Label>
            <Input
              id="space-name"
              value={name}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Поездка в горы"
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-currency">Валюта</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="space-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={create.isPending} aria-busy={create.isPending}>
              {create.isPending ? "Создаём…" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
