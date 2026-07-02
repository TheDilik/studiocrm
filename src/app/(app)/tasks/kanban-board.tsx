"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { CalendarDays, Plus } from "lucide-react";
import { moveTaskAction } from "@/app/actions/tasks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { TASK_PRIORITY } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TaskDialog, type TaskDialogTask } from "./task-dialog";
import { TimerButton } from "./timer-button";

export type KanbanTask = TaskDialogTask & {
  project: { id: string; name: string };
  assignee: { id: string; name: string | null } | null;
  /** startedAt активного таймера текущего пользователя по этой задаче */
  myRunningStartedAt: Date | null;
};

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "BACKLOG", title: "Бэклог" },
  { status: "IN_PROGRESS", title: "В работе" },
  { status: "REVIEW", title: "На проверке" },
  { status: "DONE", title: "Готово" },
];

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  LOW: "border-l-muted-foreground/30",
  MEDIUM: "border-l-sky-400",
  HIGH: "border-l-amber-400",
  URGENT: "border-l-red-500",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function KanbanBoard({
  tasks: serverTasks,
  projects,
  users,
  canDelete,
}: {
  tasks: KanbanTask[];
  projects: { id: string; name: string }[];
  users: { id: string; name: string }[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(serverTasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  // Синхронизация с сервером после revalidate
  const serverKey = useMemo(
    () => serverTasks.map((t) => `${t.id}:${t.status}:${t.myRunningStartedAt ?? ""}`).join(","),
    [serverTasks]
  );
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setTasks(serverTasks);
  }

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, KanbanTask[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const t of tasks) map.get(t.status)?.push(t);
    return map;
  }, [tasks]);

  async function drop(status: TaskStatus, beforeTaskId: string | null) {
    if (!dragId) return;
    const moving = tasks.find((t) => t.id === dragId);
    setDragId(null);
    setOverColumn(null);
    if (!moving) return;
    if (moving.status === status && moving.id === beforeTaskId) return;

    // Оптимистичное обновление
    const column = (byStatus.get(status) ?? []).filter((t) => t.id !== dragId);
    const insertAt = beforeTaskId
      ? column.findIndex((t) => t.id === beforeTaskId)
      : column.length;
    const newColumn = [...column];
    newColumn.splice(insertAt < 0 ? column.length : insertAt, 0, {
      ...moving,
      status,
    });

    setTasks((prev) => {
      const rest = prev.filter((t) => t.id !== dragId && t.status !== status);
      return [...rest, ...newColumn];
    });

    const result = await moveTaskAction({
      taskId: moving.id,
      status,
      orderedIds: newColumn.map((t) => t.id),
    });
    if (!result.ok) {
      setTasks(serverTasks); // откат
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const columnTasks = byStatus.get(col.status) ?? [];
        return (
          <div
            key={col.status}
            className={cn(
              "flex min-h-64 flex-col rounded-xl border bg-muted/30 transition-colors",
              overColumn === col.status && dragId && "border-primary/50 bg-accent/50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(col.status);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setOverColumn(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(col.status, null);
            }}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="text-sm font-semibold">
                {col.title}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <TaskDialog
                projects={projects}
                users={users}
                defaultStatus={col.status}
                canDelete={canDelete}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={`Добавить в «${col.title}»`}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                }
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(task.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverColumn(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOverColumn(col.status);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    drop(col.status, task.id);
                  }}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    dragId === task.id && "opacity-40"
                  )}
                >
                  <TaskDialog
                    projects={projects}
                    users={users}
                    task={task}
                    canDelete={canDelete}
                    trigger={
                      <div
                        className={cn(
                          "space-y-2 rounded-lg border border-l-3 bg-card p-3 shadow-xs transition-shadow hover:shadow-sm",
                          PRIORITY_BORDER[task.priority]
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium leading-snug">
                            {task.title}
                          </div>
                          <TimerButton
                            taskId={task.id}
                            runningStartedAt={task.myRunningStartedAt}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {task.project.name}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge {...TASK_PRIORITY[task.priority]} />
                            {task.dueDate && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs",
                                  new Date(task.dueDate) < new Date() &&
                                    task.status !== "DONE"
                                    ? "font-medium text-destructive"
                                    : "text-muted-foreground"
                                )}
                              >
                                <CalendarDays className="size-3" />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                          {task.assignee?.name && (
                            <Avatar className="size-6">
                              <AvatarFallback className="text-[10px]">
                                {initials(task.assignee.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    }
                  />
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-6 text-xs text-muted-foreground">
                  Перетащите задачу сюда
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
