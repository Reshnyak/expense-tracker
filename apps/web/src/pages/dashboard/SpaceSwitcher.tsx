import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { useSpaces } from "@/features/spaces/useSpaces";
import { cn } from "@/shared/lib/utils";
import { setLastSpaceId } from "@/shared/lib/lastSpace";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { CreateSpaceDialog } from "./CreateSpaceDialog";

/** Header control: pick the active space or create a new one. */
export function SpaceSwitcher({ activeSpaceId }: { activeSpaceId?: string }) {
  const navigate = useNavigate();
  const { data: spaces, isLoading, error } = useSpaces();
  const [createOpen, setCreateOpen] = useState(false);

  const active = spaces?.find((s) => s.id === activeSpaceId);

  function open(id: string) {
    setLastSpaceId(id);
    navigate(`/spaces/${id}`);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-52 gap-1.5">
            {isLoading && <Loader2 className="size-3.5 shrink-0 animate-spin opacity-60" />}
            <span className="truncate">{active?.name ?? "Пространства"}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Пространства</DropdownMenuLabel>
          {error && (
            <DropdownMenuItem disabled className="text-destructive">
              Не удалось загрузить пространства
            </DropdownMenuItem>
          )}
          {spaces?.map((s) => (
            <DropdownMenuItem key={s.id} onSelect={() => open(s.id)}>
              <Check
                className={cn("size-4", s.id === activeSpaceId ? "opacity-100" : "opacity-0")}
              />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-muted-foreground text-xs">{s.currency}</span>
            </DropdownMenuItem>
          ))}
          {spaces && spaces.length === 0 && (
            <DropdownMenuItem disabled>Пока нет пространств</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Создать пространство
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateSpaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
