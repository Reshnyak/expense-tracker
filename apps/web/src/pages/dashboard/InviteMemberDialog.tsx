import { useState } from "react";
import type { ReactNode } from "react";

import { useAddMember } from "@/features/members/useMembers";
import { HttpError } from "@/shared/api/http";
import type { MemberRole } from "@/shared/api/types";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberDialog({
  spaceId,
  children,
}: {
  spaceId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const add = useAddMember(spaceId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError("Введите корректный email.");
      return;
    }
    setError(null);
    add.mutate(
      { email: trimmed, role },
      {
        onSuccess: () => {
          setOpen(false);
          setEmail("");
          setRole("member");
        },
        onError: (err) => {
          if (err instanceof HttpError && err.status === 404) {
            setError("Пользователь не найден. Сначала он должен зарегистрироваться.");
          } else if (err instanceof HttpError && err.status === 409) {
            setError("Этот пользователь уже участник пространства.");
          } else {
            setError("Не удалось добавить участника. Попробуйте позже.");
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пригласить участника</DialogTitle>
          <DialogDescription>
            У человека уже должен быть аккаунт в журнале. Добавьте его по email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoFocus
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="friend@example.com"
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Роль</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Участник</SelectItem>
                <SelectItem value="owner">Владелец</SelectItem>
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
            <Button type="submit" disabled={add.isPending} aria-busy={add.isPending}>
              {add.isPending ? "Добавляем…" : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
