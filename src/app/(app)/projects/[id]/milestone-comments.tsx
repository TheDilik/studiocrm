"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { addMilestoneCommentAction } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

export type MilestoneComment = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string };
};

/** Комментарии к этапу — общий тред с клиентским порталом. */
export function MilestoneComments({
  milestoneId,
  comments,
}: {
  milestoneId: string;
  comments: MilestoneComment[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const result = await addMilestoneCommentAction(milestoneId, {
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

  return (
    <div className="mt-2 border-t pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="size-3.5" />
        {comments.length > 0 ? `Комментарии (${comments.length})` : "Оставить комментарий"}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
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
          <form onSubmit={onSubmit} className="space-y-2">
            <Textarea name="body" rows={2} placeholder="Ответить клиенту..." required />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? "Отправка..." : "Отправить"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
