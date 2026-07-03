"use client";

import { Trash2 } from "lucide-react";
import { removeTeamMemberAction } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ROLE_LABELS } from "@/lib/labels";
import { TeamMemberDialog } from "./team-member-dialog";
import type { Role } from "@prisma/client";

export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export function TeamCard({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div
          key={m.userId}
          className="flex items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div>
            <div className="text-sm font-medium">
              {m.name}
              {m.userId === currentUserId && (
                <span className="ml-2 text-xs text-muted-foreground">(вы)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{m.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
            {m.userId !== currentUserId && (
              <ConfirmDelete
                title={`Убрать «${m.name}» из команды?`}
                description="Учётная запись не удаляется — только доступ к организации. История задач и времени сохранится."
                action={removeTeamMemberAction.bind(null, m.userId)}
                trigger={
                  <Button variant="ghost" size="icon" aria-label={`Убрать «${m.name}»`}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                }
              />
            )}
          </div>
        </div>
      ))}
      <TeamMemberDialog />
    </div>
  );
}
