import Link from "next/link";
import { Plus } from "lucide-react";
import { canManageClients, canManageSettings, requireSession } from "@/lib/rbac";
import { AccessDenied } from "@/components/access-denied";
import { listEmployees, listUnlinkedUsers } from "@/lib/services/employees";
import { formatHours, formatMoney } from "@/lib/format";
import { ABSENCE_TYPE, RATE_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeFormDialog } from "./employee-form-dialog";

export const metadata = { title: "Сотрудники — StudioCRM" };

/** Норма на неделю для полосы загрузки, часов */
const WEEK_NORM_HOURS = 40;

export default async function EmployeesPage() {
  const ctx = await requireSession();
  const isOwner = canManageSettings(ctx.role);
  if (!canManageClients(ctx.role)) return <AccessDenied />;

  const [employees, unlinkedUsers] = await Promise.all([
    listEmployees(ctx),
    isOwner ? listUnlinkedUsers(ctx) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Сотрудники</h1>
        {isOwner && (
          <EmployeeFormDialog
            users={unlinkedUsers}
            trigger={
              <Button>
                <Plus className="size-4" />
                Новый сотрудник
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead className="hidden md:table-cell">Должность</TableHead>
              {isOwner && (
                <TableHead className="hidden lg:table-cell text-right">
                  Ставка
                </TableHead>
              )}
              <TableHead className="text-center">Открытых задач</TableHead>
              <TableHead className="min-w-40">Загрузка за неделю</TableHead>
              <TableHead className="hidden sm:table-cell">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Сотрудников пока нет
                </TableCell>
              </TableRow>
            )}
            {employees.map((e) => {
              const hours = e.weekMinutes / 60;
              const loadPercent = Math.min(
                100,
                Math.round((hours / WEEK_NORM_HOURS) * 100)
              );
              return (
                <TableRow key={e.id} className={!e.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <Link
                      href={`/employees/${e.id}`}
                      className="font-medium hover:underline"
                    >
                      {e.fullName}
                    </Link>
                    {!e.userId && (
                      <div className="text-xs text-muted-foreground">
                        без учётной записи
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {e.position ?? "—"}
                  </TableCell>
                  {isOwner && (
                    <TableCell className="hidden lg:table-cell text-right text-sm">
                      {formatMoney(e.rateAmount)}{" "}
                      <span className="text-muted-foreground">
                        {RATE_TYPE[e.rateType].replace("₽", "")}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-center">{e.openTasks}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            loadPercent > 85
                              ? "bg-red-500"
                              : loadPercent > 60
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatHours(e.weekMinutes)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {e.absentType ? (
                      <Badge variant="secondary" className="border-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        {ABSENCE_TYPE[e.absentType]}
                      </Badge>
                    ) : e.isActive ? (
                      <Badge variant="secondary" className="border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Работает
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Неактивен</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
