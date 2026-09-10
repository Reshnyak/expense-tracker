import { UserPlus } from "lucide-react";

import type { SpaceMember } from "@/shared/api/types";
import { initials } from "@/shared/lib/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

import { InviteMemberDialog } from "./InviteMemberDialog";

const MAX_SHOWN = 5;

export function MembersBar({
  spaceId,
  members,
}: {
  spaceId: string;
  members: SpaceMember[];
}) {
  const shown = members.slice(0, MAX_SHOWN);
  const rest = members.length - shown.length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {shown.map((m) => (
          <Avatar
            key={m.user_id}
            className="ring-background size-7 ring-2"
            title={m.user.name || m.user.email}
          >
            <AvatarImage src={m.user.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[10px]">
              {initials(m.user.name || m.user.email)}
            </AvatarFallback>
          </Avatar>
        ))}
        {rest > 0 && (
          <div className="bg-muted text-muted-foreground ring-background flex size-7 items-center justify-center rounded-full text-[10px] ring-2">
            +{rest}
          </div>
        )}
      </div>
      <InviteMemberDialog spaceId={spaceId}>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4" />
          Пригласить
        </Button>
      </InviteMemberDialog>
    </div>
  );
}
