import type { ReactNode } from "react";

import type { SpaceMember } from "@/shared/api/types";
import { initials } from "@/shared/lib/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

/** Full roster of a space with each member's contact details inline. */
export function MembersListDialog({
  members,
  children,
}: {
  members: SpaceMember[];
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Участники · {members.length}</DialogTitle>
        </DialogHeader>
        <ul className="divide-y">
          {members.map((m) => {
            const name = m.user.name || m.user.email;
            return (
              <li key={m.user_id} className="flex items-start gap-3 py-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={m.user.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{name}</span>
                    <Badge
                      variant={m.role === "owner" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {m.role === "owner" ? "Владелец" : "Участник"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {m.user.email}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {m.user.phone || "телефон не указан"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
