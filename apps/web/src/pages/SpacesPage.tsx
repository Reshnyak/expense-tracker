import { Navigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";

import { CreateSpaceDialog } from "@/pages/dashboard/CreateSpaceDialog";
import { useSpaces } from "@/features/spaces/useSpaces";
import { getLastSpaceId } from "@/shared/lib/lastSpace";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

/**
 * `/spaces` is a resolver, not a list: send the user into a space (the last one
 * they opened, or the first available), or show onboarding when they have none.
 */
export function SpacesPage() {
  const { data: spaces, isLoading, error } = useSpaces();

  if (isLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Загрузка…
      </p>
    );
  }

  if (error) {
    return <p className="text-destructive">Не удалось загрузить пространства.</p>;
  }

  if (spaces && spaces.length > 0) {
    const last = getLastSpaceId();
    const target = spaces.find((s) => s.id === last) ?? spaces[0];
    return <Navigate to={`/spaces/${target.id}`} replace />;
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl font-semibold">
            Создайте первое пространство
          </CardTitle>
          <CardDescription>
            Пространство — это общий журнал расходов: пригласите участников и
            записывайте траты, балансы посчитаются сами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSpaceDialog>
            <Button className="w-full">
              <Plus className="size-4" />
              Новое пространство
            </Button>
          </CreateSpaceDialog>
        </CardContent>
      </Card>
    </div>
  );
}
