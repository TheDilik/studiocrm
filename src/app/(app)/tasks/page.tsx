import { Plus } from "lucide-react";
import { canManageClients, requireSession } from "@/lib/rbac";
import { listAccessibleProjects, listTasks } from "@/lib/services/tasks";
import { listOrgUsers } from "@/lib/services/projects";
import {
  addDays,
  getRunningEntry,
  getTimeSummary,
  getWeekBoard,
  startOfWeek,
} from "@/lib/services/time";
import { taskFiltersSchema } from "@/lib/validators/task";
import { Button } from "@/components/ui/button";
import { TasksToolbar } from "./tasks-toolbar";
import { KanbanBoard, type KanbanTask } from "./kanban-board";
import { CalendarView } from "./calendar-view";
import { TimeSummaryView } from "./time-summary-view";
import { TaskDialog } from "./task-dialog";
import { ManualTimeDialog } from "./manual-time-dialog";
import { RunningTimerBanner } from "./running-timer-banner";

export const metadata = { title: "Задачи — StudioCRM" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const view = params.view ?? "kanban";
  const weekOffset = Number(params.week ?? "0") || 0;
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const filters = taskFiltersSchema.parse(params);
  const canManage = canManageClients(ctx.role);

  const [tasks, projects, users, running] = await Promise.all([
    listTasks(ctx, filters),
    listAccessibleProjects(ctx),
    listOrgUsers(ctx),
    getRunningEntry(ctx),
  ]);

  const kanbanTasks: KanbanTask[] = tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    assigneeId: t.assigneeId,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    project: t.project,
    assignee: t.assignee,
    myRunningStartedAt:
      t.timeEntries.find((e) => e.userId === ctx.userId)?.startedAt ?? null,
  }));

  const taskOptions = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectName: t.project.name,
  }));

  const [board, summary] =
    view === "calendar"
      ? [await getWeekBoard(ctx, weekStart), null]
      : view === "time"
        ? [null, await getTimeSummary(ctx, weekStart)]
        : [null, null];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Задачи</h1>
        <div className="flex gap-2">
          <ManualTimeDialog
            tasks={taskOptions}
            trigger={<Button variant="outline">Внести время</Button>}
          />
          <TaskDialog
            projects={projects}
            users={users}
            canDelete={canManage}
            trigger={
              <Button>
                <Plus className="size-4" />
                Новая задача
              </Button>
            }
          />
        </div>
      </div>

      {running && running.startedAt && (
        <RunningTimerBanner
          taskTitle={running.task.title}
          projectName={running.task.project.name}
          startedAt={running.startedAt}
        />
      )}

      <TasksToolbar
        view={view}
        weekStart={weekStart}
        projects={projects}
        users={users}
        showFilters={ctx.role !== "EMPLOYEE"}
      />

      {view === "kanban" && (
        <KanbanBoard
          tasks={kanbanTasks}
          projects={projects}
          users={users}
          canDelete={canManage}
        />
      )}
      {view === "calendar" && board && (
        <CalendarView board={board} weekStart={weekStart} />
      )}
      {view === "time" && summary && <TimeSummaryView entries={summary} />}
    </div>
  );
}
