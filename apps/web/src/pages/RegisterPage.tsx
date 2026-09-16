import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { startGoogleLogin } from "@/features/auth/oauth";
import { useRegister } from "@/features/auth/useRegister";
import { HttpError } from "@/shared/api/http";
import { useAuth } from "@/shared/auth/AuthContext";
import { sanitizeRedirect } from "@/shared/auth/redirect";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { FernBackdrop } from "@/shared/ui/fern-backdrop";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

interface RegisterLocationState {
  from?: { pathname?: string };
}

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

export function RegisterPage() {
  const location = useLocation();
  const state = location.state as RegisterLocationState | null;
  const redirectTo = sanitizeRedirect(state?.from?.pathname);

  const { loginWithTokens } = useAuth();
  const register = useRegister();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const serverError = register.isError
    ? register.error instanceof HttpError && register.error.status === 409
      ? "Пользователь с таким email уже зарегистрирован."
      : register.error instanceof HttpError && register.error.status === 422
        ? "Проверьте правильность полей."
        : "Не удалось зарегистрироваться. Попробуйте позже."
    : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = "Укажите email.";
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = "Введите корректный email.";
    if (password.length < MIN_PASSWORD)
      next.password = `Пароль должен быть не короче ${MIN_PASSWORD} символов.`;
    if (confirm !== password) next.confirm = "Пароли не совпадают.";
    setErrors(next);
    if (next.email || next.password || next.confirm) return;

    register.mutate(
      { email: trimmedEmail, password, name: name.trim() || undefined },
      {
        onSuccess: (pair) => loginWithTokens(pair.access_token, pair.refresh_token),
      },
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <FernBackdrop className="absolute -top-16 -right-20 h-[30rem] w-[30rem] rotate-[160deg] md:h-[36rem] md:w-[36rem]" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="font-serif text-3xl font-semibold italic">Регистрация</h1>
          </CardTitle>
          <CardDescription>Создайте аккаунт по email и паролю</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-name">Имя (необязательно)</Label>
              <Input
                id="reg-name"
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "reg-email-error" : undefined}
              />
              {errors.email && (
                <p id="reg-email-error" role="alert" className="text-destructive text-xs">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-password">Пароль</Label>
              <Input
                id="reg-password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "reg-password-error" : undefined}
              />
              {errors.password && (
                <p id="reg-password-error" role="alert" className="text-destructive text-xs">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-confirm">Повторите пароль</Label>
              <Input
                id="reg-confirm"
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setErrors((p) => ({ ...p, confirm: undefined }));
                }}
                aria-invalid={errors.confirm ? true : undefined}
                aria-describedby={errors.confirm ? "reg-confirm-error" : undefined}
              />
              {errors.confirm && (
                <p id="reg-confirm-error" role="alert" className="text-destructive text-xs">
                  {errors.confirm}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={register.isPending}
              aria-busy={register.isPending}
            >
              {register.isPending ? "Создаём аккаунт…" : "Зарегистрироваться"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">или</span>
            <span className="bg-border h-px flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => startGoogleLogin(redirectTo)}
          >
            Зарегистрироваться через Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-muted-foreground text-sm">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-primary font-medium underline underline-offset-4">
              Войдите
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
