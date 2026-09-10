import { LogOut } from "lucide-react";

import { useAuth } from "@/shared/auth/AuthContext";
import { clearLastSpaceId } from "@/shared/lib/lastSpace";
import { initials } from "@/shared/lib/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

/** Header control: user identity + sign out. */
export function ProfileMenu() {
  const { user, logout } = useAuth();
  const label = user?.name || user?.email || "Профиль";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="size-6">
            <AvatarImage src={user?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[10px]">{initials(label)}</AvatarFallback>
          </Avatar>
          <span className="max-w-32 truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user?.name || "—"}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            clearLastSpaceId();
            logout();
          }}
        >
          <LogOut className="size-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
