"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { MilestoneStatus } from "@prisma/client";
import {
  addMilestoneCommentAction,
  approveMilestoneAction,
} from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { MILESTONE_STATUS } from "@/lib/labels";

export type PortalMilestone = {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  amount: number | null;
  status: MilestoneStatus;
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    author: { name: string | null; email: string };
  }[];
};

export function MilestoneCard({ milestone, index }: { milestone: PortalMilestone; index: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const result = await addMilestoneCommentAction(milestone.id, {
      body: fd.get("body") as string,
    });
    setPending(false);
    if (result.ok) {
      form.reset();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function onApprove() {
    setPending(true);
    setError(null);
    const result = await approveMilestoneAction(milestone.id);
    setPending(false);
    if (result.ok) router.refresh();
    else setError(result.error);
  }

  const canApprove = milestone.status !== "APPROVED";

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {index + 1}
          </div>
          <div>
            <div className="font-medium">{milestone.name}</div>
            <div className="text-xs text-muted-foreground">
              до {formatDate(milestone.dueDate)}
              {milestone.amount != null && <> · {formatMoney(milestone.amount)}</>}
            </div>
          </div>
        </div>
        <StatusBadge {...MILESTONE_STATUS[milestone.status]} />
      </div>

      {milestone.description && (
        <p className="mt-3 text-sm text-muted-foreground">{milestone.description}</p>
      )}

      {canApprove && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={pending}
          onClick={onApprove}
        >
          <CheckCircle2 className="size-4" /> Согласовать этап
        </Button>
      )}

      {/* Комментарии */}
      <div className="mt-4 space-y-3 border-t pt-3">
        {milestone.comments.length === 0 && (
          <p className="text-xs text-muted-foreground">Комментариев пока нет</p>
        )}
        {milestone.comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {c.author.name ?? c.author.email}
              </span>{" "}
              · {formatDateTime(c.createdAt)}
            </div>
            <p>{c.body}</p>
          </div>
        ))}
        <form onSubmit={onComment} className="space-y-2">
          <Textarea name="body" rows={2} placeholder="Оставить комментарий..." required />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Отправка..." : "Отправить"}
          </Button>
        </form>
      </div>
    </div>
  );
}
