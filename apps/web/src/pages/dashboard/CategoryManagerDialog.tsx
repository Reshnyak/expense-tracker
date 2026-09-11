import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/useCategories";
import { HttpError } from "@/shared/api/http";
import type { Category } from "@/shared/api/types";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
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

const DEFAULT_COLOR = "#64748b";

export function CategoryManagerDialog({
  spaceId,
  categories,
  children,
}: {
  spaceId: string;
  categories: Category[];
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Категории</DialogTitle>
          <DialogDescription>
            Ярлыки для расходов внутри пространства. Удаление категории не трогает
            сами расходы — у них просто снимается ярлык.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {categories.length === 0 && (
            <p className="text-muted-foreground text-sm">Пока нет категорий.</p>
          )}
          {categories.map((c) => (
            <CategoryRow key={c.id} spaceId={spaceId} category={c} />
          ))}
        </div>

        <AddCategoryForm spaceId={spaceId} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({ spaceId, category }: { spaceId: string; category: Category }) {
  const update = useUpdateCategory(spaceId);
  const del = useDeleteCategory(spaceId);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color ?? DEFAULT_COLOR);
  const [icon, setIcon] = useState(category.icon ?? "");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name.trim() !== category.name ||
    color !== (category.color ?? DEFAULT_COLOR) ||
    icon !== (category.icon ?? "");

  // Keep the row in sync with a category that changed elsewhere (another
  // member edited it, or our own save came back) — but only while this row
  // has no unsaved edits of its own, so we never clobber in-progress input
  // and, symmetrically, never auto-save a stale value over someone else's
  // change just because the prop moved out from under us.
  //
  // We compare against the PREVIOUS category snapshot, not the incoming one:
  // the moment the prop changes, local state is by definition stale relative
  // to the new prop, so comparing straight to it would always look "dirty"
  // and the sync would never happen.
  const prevCategoryRef = useRef(category);
  useEffect(() => {
    const prev = prevCategoryRef.current;
    const untouchedSincePrevSync =
      name.trim() === prev.name &&
      color === (prev.color ?? DEFAULT_COLOR) &&
      icon === (prev.icon ?? "");
    if (untouchedSincePrevSync) {
      setName(category.name);
      setColor(category.color ?? DEFAULT_COLOR);
      setIcon(category.icon ?? "");
    }
    prevCategoryRef.current = category;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.name, category.color, category.icon]);

  function save() {
    if (!dirty || update.isPending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Название не может быть пустым.");
      return;
    }
    setError(null);
    update.mutate(
      { id: category.id, input: { name: trimmed, color, icon: icon || undefined } },
      {
        onError: (err) =>
          setError(
            err instanceof HttpError && err.status === 409
              ? "Категория с таким названием уже есть."
              : "Не удалось сохранить.",
          ),
      },
    );
  }

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Цвет категории"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={save}
          className="border-input size-8 shrink-0 cursor-pointer rounded border bg-transparent"
        />
        <Input
          aria-label="Иконка"
          value={icon}
          maxLength={8}
          onChange={(e) => setIcon(e.target.value)}
          onBlur={save}
          placeholder="🍔"
          className="w-14 text-center"
        />
        <Input
          aria-label="Название категории"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onBlur={save}
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={!dirty || update.isPending}
          aria-label="Сохранить категорию"
        >
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : dirty ? (
            "Сохранить"
          ) : (
            <Check className="size-4" />
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Удалить категорию ${category.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить категорию «{category.name}»?</AlertDialogTitle>
              <AlertDialogDescription>
                Расходы сохранятся, но потеряют этот ярлык. Действие необратимо.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => del.mutate(category.id)}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p role="alert" className="text-destructive pl-10 text-xs">
          {error}
        </p>
      )}
    </form>
  );
}

function AddCategoryForm({ spaceId }: { spaceId: string }) {
  const create = useCreateCategory(spaceId);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState("");
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
      { name: trimmed, color, icon: icon || undefined },
      {
        onSuccess: () => {
          setName("");
          setIcon("");
          setColor(DEFAULT_COLOR);
        },
        onError: (err) =>
          setError(
            err instanceof HttpError && err.status === 409
              ? "Категория с таким названием уже есть."
              : "Не удалось создать категорию.",
          ),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-2 flex flex-col gap-1 border-t pt-3">
      <Label className="text-muted-foreground text-xs">Новая категория</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Цвет новой категории"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="border-input size-8 shrink-0 cursor-pointer rounded border bg-transparent"
        />
        <Input
          aria-label="Иконка новой категории"
          value={icon}
          maxLength={8}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🍔"
          className="w-14 text-center"
        />
        <Input
          aria-label="Название новой категории"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Продукты"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Добавить
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive pl-10 text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
