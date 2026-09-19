import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useUpdateMe } from "@/features/profile/useUpdateMe";
import { useAuth } from "@/shared/auth/AuthContext";
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

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

/** Edit the current user's own profile (name parts + phone; email is read-only). */
export function ProfileDialog({ open, onOpenChange, children }: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const { user } = useAuth();
  const update = useUpdateMe();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setPhone(user.phone ?? "");
    setError(null);
  }, [isOpen, user]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    update.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      },
      {
        onSuccess: () => setOpen(false),
        onError: () => setError("Не удалось сохранить профиль. Попробуйте позже."),
      },
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Профиль</DialogTitle>
          <DialogDescription>Имя видят другие участники ваших пространств.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="profile-first">Имя</Label>
              <Input
                id="profile-first"
                value={firstName}
                autoFocus
                maxLength={120}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Иван"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="profile-last">Фамилия</Label>
              <Input
                id="profile-last"
                value={lastName}
                maxLength={120}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Петров"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-phone">Телефон</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              maxLength={32}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 999 123-45-67"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user?.email ?? ""} disabled readOnly />
            <p className="text-muted-foreground text-xs">Email входа изменить нельзя.</p>
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
            <Button type="submit" disabled={update.isPending} aria-busy={update.isPending}>
              {update.isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
