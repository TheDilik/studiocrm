import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { canManageClients, canViewFinance, requireSession } from "@/lib/rbac";
import { getProject, listOrgUsers } from "@/lib/services/projects";
import { listClients } from "@/lib/services/clients";
import { deleteProjectAction, deleteMilestoneAction } from "@/app/actions/projects";
import {
  formatDate,
  formatHours,
  formatMoney,
  toDateInputValue,
  toMajor,
} from "@/lib/format";
import {
  MILESTONE_STATUS,
  PROJECT_STATUS,
  PROJECT_TYPE,
  TASK_PRIORITY,
  TASK_STATUS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ProjectFormDialog } from "../project-form-dialog";
import { MilestoneDialog } from "./milestone-dialog";

export const metadata = { title: "Проект — StudioCRM" };

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;
  const canManage = canManageClients(ctx.role);
  const showFinance = canViewFinance(ctx.role);

  const [project, users, clients] = await Promise.all([
    getProject(ctx, id),
    listOrgUsers(ctx),
    canManage ? listClients(ctx, {}) : Promise.resolve([]),
  ]);
  if (!project) notFound();

  const p = project.profitability;

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Все проекты
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <StatusBadge {...PROJECT_STATUS[project.status]} />
          </div>
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/clients/${project.client.id}`}
              className="hover:underline"
            >
              {project.client.companyName}
            </Link>{" "}
            · {PROJECT_TYPE[project.type]} · {formatDate(project.startDate)} —{" "}
            {formatDate(project.deadline)}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <ProjectFormDialog
              projectId={project.id}
              clients={clients.map((c) => ({
                id: c.id,
                companyName: c.companyName,
              }))}
              users={users}
              initial={{
                clientId: project.clientId,
                name: project.name,
                type: project.type,
                budgetMajor: toMajor(project.budget),
                startDate: toDateInputValue(project.startDate),
                deadline: toDateInputValue(project.deadline),
                status: project.status,
                managerId: project.managerId ?? "",
                memberIds: project.members.map((m) => m.userId),
              }}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Редактировать
                </Button>
              }
            />
            <ConfirmDelete
              title={`Удалить проект «${project.name}»?`}
              description="Будут удалены все задачи, этапы и записи времени."
              action={deleteProjectAction.bind(null, project.id)}
              redirectTo="/projects"
              trigger={
                <Button variant="outline" size="icon" aria-label="Удалить проект">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Рентабельность (финансы видят владелец и менеджер) */}
      {showFinance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Бюджет
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold">
              {formatMoney(p.budget)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Зарплатная часть
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatMoney(p.salaryCost)}</div>
              <div className="text-xs text-muted-foreground">
                {formatHours(p.trackedMinutes)} по трекингу
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Прямые расходы
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold">
              {formatMoney(p.directExpenses)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Прибыль
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`text-xl font-bold ${
                p.profit < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatMoney(p.profit)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Маржа
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`text-xl font-bold ${
                p.marginPercent < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {p.marginPercent}%
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Этапы */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Этапы проекта</CardTitle>
            {canManage && (
              <MilestoneDialog
                projectId={project.id}
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" /> Добавить этап
                  </Button>
                }
              />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {project.milestones.length === 0 && (
              <p className="text-sm text-muted-foreground">Этапов пока нет</p>
            )}
            {project.milestones.map((m, index) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      до {formatDate(m.dueDate)}
                      {m.amount != null && showFinance && (
                        <> · {formatMoney(m.amount)}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge {...MILESTONE_STATUS[m.status]} />
                  {canManage && (
                    <>
                      <MilestoneDialog
                        projectId={project.id}
                        milestone={m}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Редактировать этап"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <ConfirmDelete
                        title={`Удалить этап «${m.name}»?`}
                        action={deleteMilestoneAction.bind(null, project.id, m.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Удалить этап"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Команда */}
        <Card>
          <CardHeader>
            <CardTitle>Команда</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.manager && (
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {initials(project.manager.name ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{project.manager.name}</div>
                  <div className="text-xs text-muted-foreground">Менеджер</div>
                </div>
              </div>
            )}
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {initials(m.user.name ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">{m.user.name}</div>
              </div>
            ))}
            {!project.manager && project.members.length === 0 && (
              <p className="text-sm text-muted-foreground">Команда не назначена</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Задачи проекта */}
      <Card>
        <CardHeader>
          <CardTitle>Задачи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {project.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Задач пока нет — канбан появится в Фазе 3
            </p>
          )}
          {project.tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="text-sm font-medium">{task.title}</div>
              <div className="flex items-center gap-2">
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    до {formatDate(task.dueDate)}
                  </span>
                )}
                <StatusBadge {...TASK_PRIORITY[task.priority]} />
                <StatusBadge {...TASK_STATUS[task.status]} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
