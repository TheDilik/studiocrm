import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { canManageSettings, requireSession } from "@/lib/rbac";
import { getEmployee, listUnlinkedUsers } from "@/lib/services/employees";
import { deleteAbsenceAction, deleteEmployeeAction } from "@/app/actions/employees";
import {
  formatDate,
  formatHours,
  formatMoney,
  toDateInputValue,
  toMajor,
} from "@/lib/format";
import { ABSENCE_TYPE, RATE_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { EmployeeFormDialog } from "../employee-form-dialog";
import { AbsenceDialog } from "./absence-dialog";

export const metadata = { title: "Сотрудник — StudioCRM" };

function monthStart(d: Date, offset: number) {
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

export default async function EmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;
  const monthOffset = Number((await searchParams).month ?? "0") || 0;
  const periodStart = monthStart(new Date(), monthOffset);
  const periodEnd = monthStart(new Date(), monthOffset + 1);
  const isOwner = canManageSettings(ctx.role);

  const [employee, unlinkedUsers] = await Promise.all([
    getEmployee(ctx, id, periodStart, periodEnd),
    isOwner ? listUnlinkedUsers(ctx, id) : Promise.resolve([]),
  ]);
  if (!employee) notFound();

  const rawLabel = periodStart.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  const periodLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/employees"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Все сотрудники
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {employee.fullName}
            </h1>
            {!employee.isActive && <Badge variant="secondary">Неактивен</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">
            {[
              employee.position,
              employee.hireDate && `в команде с ${formatDate(employee.hireDate)}`,
              employee.phone,
              employee.email,
              employee.telegram,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <EmployeeFormDialog
              employeeId={employee.id}
              users={unlinkedUsers}
              initial={{
                fullName: employee.fullName,
                position: employee.position ?? "",
                rateType: employee.rateType,
                rateMajor: toMajor(employee.rateAmount),
                hireDate: toDateInputValue(employee.hireDate),
                phone: employee.phone ?? "",
                email: employee.email ?? "",
                telegram: employee.telegram ?? "",
                userId: employee.userId ?? "",
                isActive: employee.isActive,
              }}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Редактировать
                </Button>
              }
            />
            <ConfirmDelete
              title={`Удалить сотрудника «${employee.fullName}»?`}
              action={deleteEmployeeAction.bind(null, employee.id)}
              redirectTo="/employees"
              trigger={
                <Button variant="outline" size="icon" aria-label="Удалить">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Ставка — только владельцу */}
      {isOwner && (
        <Card className="max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ставка
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatMoney(employee.rateAmount)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {RATE_TYPE[employee.rateType].replace("₽", "")}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Отчёт за период */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Отчёт за период</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" asChild>
              <Link href={`?month=${monthOffset - 1}`} aria-label="Предыдущий месяц">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="min-w-36 text-center text-sm text-muted-foreground">
              {periodLabel}
            </span>
            <Button variant="outline" size="icon" className="size-8" asChild>
              <Link href={`?month=${monthOffset + 1}`} aria-label="Следующий месяц">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!employee.userId ? (
            <p className="text-sm text-muted-foreground">
              Сотрудник не привязан к учётной записи — трекинг времени недоступен
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg border px-4 py-2.5">
                  <div className="text-xs text-muted-foreground">Отработано</div>
                  <div className="text-lg font-bold">
                    {formatHours(employee.report.totalMinutes)}
                  </div>
                </div>
                <div className="rounded-lg border px-4 py-2.5">
                  <div className="text-xs text-muted-foreground">
                    Закрыто задач
                  </div>
                  <div className="text-lg font-bold">
                    {employee.report.doneTasks}
                  </div>
                </div>
                {isOwner && employee.rateType === "HOURLY" && (
                  <div className="rounded-lg border px-4 py-2.5">
                    <div className="text-xs text-muted-foreground">
                      Зарплата за часы
                    </div>
                    <div className="text-lg font-bold">
                      {formatMoney(
                        Math.round(
                          (employee.report.totalMinutes / 60) * employee.rateAmount
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {employee.report.byProject.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">По проектам</h3>
                  <div className="divide-y rounded-lg border">
                    {employee.report.byProject.map((p) => (
                      <div
                        key={p.projectId}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <Link
                          href={`/projects/${p.projectId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {p.projectName}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {p.taskCount}{" "}
                          {p.taskCount === 1 ? "задача" : "задач(и)"} ·{" "}
                          <span className="font-medium text-foreground">
                            {formatHours(p.minutes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {employee.report.entries.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Записи времени</h3>
                  <div className="divide-y rounded-lg border">
                    {employee.report.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-muted-foreground">
                            {formatDate(e.date)}
                          </span>{" "}
                          · {e.taskTitle}
                          <span className="text-muted-foreground">
                            {" "}
                            ({e.projectName}){e.isManual && " · вручную"}
                          </span>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatHours(e.minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {employee.report.totalMinutes === 0 && (
                <p className="text-sm text-muted-foreground">
                  За этот период времени не отработано
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Отсутствия */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Отпуска и отгулы</CardTitle>
          <AbsenceDialog
            employeeId={employee.id}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="size-4" /> Добавить
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {employee.absences.length === 0 && (
            <p className="text-sm text-muted-foreground">Записей нет</p>
          )}
          {employee.absences.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {ABSENCE_TYPE[a.type]}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {formatDate(a.startDate)} — {formatDate(a.endDate)}
                  </span>
                </div>
                {a.note && (
                  <div className="text-xs text-muted-foreground">{a.note}</div>
                )}
              </div>
              <ConfirmDelete
                title="Удалить запись об отсутствии?"
                action={deleteAbsenceAction.bind(null, employee.id, a.id)}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Удалить">
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
