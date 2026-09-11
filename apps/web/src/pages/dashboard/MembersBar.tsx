import { UserPlus } from "lucide-react";

import type { SpaceMember } from "@/shared/api/types";
import { initials } from "@/shared/lib/text";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

import { InviteMemberDialog } from "./InviteMemberDialog";
import { MemberProfileDialog } from "./MemberProfileDialog";
import { MembersListDialog } from "./MembersListDialog";

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
          <MemberProfileDialog key={m.user_id} member={m}>
            <button
              type="button"
              className="rounded-full transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={m.user.name || m.user.email}
            >
              <Avatar className="ring-background size-7 ring-2">
                <AvatarImage src={m.user.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {initials(m.user.name || m.user.email)}
                </AvatarFallback>
              </Avatar>
            </button>
          </MemberProfileDialog>
        ))}
        {rest > 0 && (
          <MembersListDialog members={members}>
            <button
              type="button"
              className="bg-muted text-muted-foreground ring-background hover:bg-accent focus-visible:ring-ring flex size-7 items-center justify-center rounded-full text-[10px] ring-2 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2"
            >
              +{rest}
            </button>
          </MembersListDialog>
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
