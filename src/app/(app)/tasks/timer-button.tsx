"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { startTimerAction, stopTimerAction } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useElapsed(startedAt: Date | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return "";
  const total = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Кнопка таймера на карточке задачи. */
export function TimerButton({
  taskId,
  runningStartedAt, // если таймер этой задачи запущен текущим пользователем
}: {
  taskId: string;
  runningStartedAt: Date | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const elapsed = useElapsed(runningStartedAt);
  const isRunning = !!runningStartedAt;

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setPending(true);
    const result = isRunning
      ? await stopTimerAction()
      : await startTimerAction(taskId);
    setPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <Button
      variant={isRunning ? "default" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={toggle}
      className={cn("h-7 gap-1 px-2 text-xs tabular-nums", isRunning && "animate-pulse")}
      aria-label={isRunning ? "Остановить таймер" : "Запустить таймер"}
    >
      {isRunning ? (
        <>
          <Square className="size-3" /> {elapsed}
        </>
      ) : (
        <Play className="size-3" />
      )}
    </Button>
  );
}
