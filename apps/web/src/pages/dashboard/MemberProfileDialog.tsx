import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";

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

export function MemberProfileDialog({
  member,
  open,
  onOpenChange,
  children,
}: {
  member: SpaceMember;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const u = member.user;
  const name = u.name || u.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Профиль участника</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarImage src={u.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <Badge variant={member.role === "owner" ? "default" : "secondary"}>
              {member.role === "owner" ? "Владелец" : "Участник"}
            </Badge>
          </div>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-4 shrink-0" />
            <dd className="truncate">{u.email}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4 shrink-0" />
            <dd className={u.phone ? "" : "text-muted-foreground"}>
              {u.phone || "телефон не указан"}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
