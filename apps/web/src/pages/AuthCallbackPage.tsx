import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { describeOAuthError, readCallbackParams } from "@/features/auth/oauth";
import { useGoogleCallback } from "@/features/auth/useGoogleCallback";
import { useAuth } from "@/shared/auth/AuthContext";
import { consumePostLoginRedirect } from "@/shared/auth/redirect";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Google redirects here (see GOOGLE_OAUTH_REDIRECT_URL). We hand the `code` +
 * `state` to the backend, which exchanges them and returns a token pair.
 */
export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const callback = useGoogleCallback();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const { code, state, error: providerError } = readCallbackParams(params);

    if (providerError) {
      setError(describeOAuthError(providerError));
      return;
    }
    if (!code || !state) {
      setError("Не передан код авторизации.");
      return;
    }

    callback.mutate(
      { code, state },
      {
        onSuccess: (pair) => {
          loginWithTokens(pair.access_token, pair.refresh_token);
          navigate(consumePostLoginRedirect(), { replace: true });
        },
        onError: () => setError("Не удалось завершить вход. Попробуйте ещё раз."),
      },
    );
  }, [params, callback, loginWithTokens, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent>
          {error ? (
            <div className="flex flex-col gap-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Вернуться ко входу</Link>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Входим…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
