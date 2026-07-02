"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Square } from "lucide-react";
import { stopTimerAction } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";

/** Плашка активного таймера над доской. */
export function RunningTimerBanner({
  taskTitle,
  projectName,
  startedAt,
}: {
  taskTitle: string;
  projectName: string;
  startedAt: Date;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <div className="text-sm">
          <span className="font-medium">{taskTitle}</span>
          <span className="text-muted-foreground"> · {projectName}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await stopTimerAction();
            setPending(false);
            router.refresh();
          }}
        >
          <Square className="size-3.5" /> Стоп
        </Button>
      </div>
    </div>
  );
}
