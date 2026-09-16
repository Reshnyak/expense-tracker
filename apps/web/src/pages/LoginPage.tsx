import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { startGoogleLogin } from "@/features/auth/oauth";
import { useDevLogin } from "@/features/auth/useDevLogin";
import { useLogin } from "@/features/auth/useLogin";
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

interface LoginLocationState {
  from?: { pathname?: string };
  authError?: string;
}

export function LoginPage() {
  const location = useLocation();
  const state = location.state as LoginLocationState | null;
  const redirectTo = sanitizeRedirect(state?.from?.pathname);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <FernBackdrop className="absolute -bottom-16 -left-20 h-[30rem] w-[30rem] md:h-[36rem] md:w-[36rem]" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="font-serif text-3xl font-semibold italic">Вход</h1>
          </CardTitle>
          <CardDescription>Общий журнал расходов</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.authError && (
            <Alert variant="destructive">
              <AlertDescription>{state.authError}</AlertDescription>
            </Alert>
          )}

          <CredentialsForm />

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
            Войти через Google
          </Button>

          {import.meta.env.DEV && <DevLoginForm />}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-muted-foreground text-sm">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-primary font-medium underline underline-offset-4">
              Зарегистрируйтесь
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Email + password sign-in. Post-login navigation (honouring `location.state.from`)
 * is handled by the `RedirectIfAuthed` wrapper once `loginWithTokens` flips the
 * auth state.
 */
function CredentialsForm() {
  const { loginWithTokens } = useAuth();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const serverError = login.isError
    ? login.error instanceof HttpError && login.error.status === 401
      ? "Неверный email или пароль."
      : "Не удалось войти. Попробуйте позже."
    : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = "Укажите email.";
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = "Введите корректный email.";
    if (!password) next.password = "Введите пароль.";
    setErrors(next);
    if (next.email || next.password) return;

    login.mutate(
      { email: trimmedEmail, password },
      {
        onSuccess: (pair) => loginWithTokens(pair.access_token, pair.refresh_token),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
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
          aria-describedby={errors.email ? "login-email-error" : undefined}
        />
        {errors.email && (
          <p id="login-email-error" role="alert" className="text-destructive text-xs">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Пароль</Label>
        <Input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((p) => ({ ...p, password: undefined }));
          }}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "login-password-error" : undefined}
        />
        {errors.password && (
          <p id="login-password-error" role="alert" className="text-destructive text-xs">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={login.isPending} aria-busy={login.isPending}>
        {login.isPending ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}

/** Локальный шорткат: выдаёт токены по любому email через POST /v1/auth/dev-login. */
function DevLoginForm() {
  const { loginWithTokens } = useAuth();
  const devLogin = useDevLogin();
  const [email, setEmail] = useState("dev@example.com");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const serverError = devLogin.isError
    ? devLogin.error instanceof HttpError && devLogin.error.status === 404
      ? "dev-login отключён (сервер не в локальном окружении)."
      : "dev-login не сработал. Проверьте, что API запущен."
    : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Укажите email.");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setFieldError("Введите корректный email.");
      return;
    }
    setFieldError(null);
    devLogin.mutate(
      { email: trimmed },
      {
        onSuccess: (pair) => loginWithTokens(pair.access_token, pair.refresh_token),
      },
    );
  }

  const errorText = fieldError ?? serverError;

  return (
    <form onSubmit={submit} noValidate className="border-t pt-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="dev-email" className="text-muted-foreground text-xs">
          Вход для разработки (только локально)
        </Label>
        <Input
          id="dev-email"
          type="email"
          name="dev-email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
          }}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={errorText ? "dev-login-error" : undefined}
          placeholder="you@example.com"
        />
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={devLogin.isPending}
          aria-busy={devLogin.isPending}
        >
          {devLogin.isPending ? "Входим…" : "Войти под этим email"}
        </Button>
        {errorText && (
          <p id="dev-login-error" role="alert" className="text-destructive text-xs">
            {errorText}
          </p>
        )}
      </div>
    </form>
  );
}
