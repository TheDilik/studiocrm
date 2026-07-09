import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { canEditFinance, canViewFinance, requireSession } from "@/lib/rbac";
import { AccessDenied } from "@/components/access-denied";
import {
  checkOverduePayments,
  getFinanceDashboard,
  listContractorNames,
  listExpenses,
  listPayments,
} from "@/lib/services/finance";
import { listClients } from "@/lib/services/clients";
import { listAccessibleProjects } from "@/lib/services/tasks";
import { prisma } from "@/lib/prisma";
import { deleteExpenseAction, deletePaymentAction } from "@/app/actions/finance";
import { formatDate, formatMoney, toDateInputValue, toMajor } from "@/lib/format";
import { EXPENSE_CATEGORY, PAYMENT_KIND, PAYMENT_STATUS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { TrendBadge } from "@/components/trend-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { getDesignVersion } from "@/lib/design-server";
import { cn } from "@/lib/utils";
import { MonthlyChart } from "./monthly-chart";
import { PaymentFormDialog } from "./payment-form-dialog";
import { ExpenseFormDialog } from "./expense-form-dialog";

export const metadata = { title: "Финансы — StudioCRM" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const ctx = await requireSession();
  const params = await searchParams;
  const tab = params.tab ?? "payments";
  const monthOffset = Number(params.month ?? "0") || 0;
  const canEdit = canEditFinance(ctx.role);
  const design = await getDesignVersion();
  if (!canViewFinance(ctx.role)) return <AccessDenied />;

  // Фоновая проверка просрочки (до подключения крона — при каждом открытии)
  await checkOverduePayments(ctx.organizationId);

  const [dashboard, payments, expenses, clients, projectsRaw, contractorNames] =
    await Promise.all([
      getFinanceDashboard(ctx, monthOffset),
      listPayments(ctx),
      listExpenses(ctx),
      listClients(ctx, {}),
      listAccessibleProjects(ctx),
      listContractorNames(ctx),
    ]);
  // Для селекта проекта в платеже нужен clientId
  const projectsWithClient = await prisma.project.findMany({
    where: { organizationId: ctx.organizationId },
    select: { id: true, name: true, clientId: true },
    orderBy: { name: "asc" },
  });

  const m = dashboard.month;
  const monthHref = (offset: number) =>
    `?${new URLSearchParams({ tab, month: String(offset) }).toString()}`;
  const tabHref = (tabName: string) =>
    `?${new URLSearchParams({ tab: tabName, month: String(monthOffset) }).toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Финансы</h1>
        {canEdit && (
          <div className="flex gap-2">
            <ExpenseFormDialog
              projects={projectsRaw}
              contractorNames={contractorNames}
              trigger={<Button variant="outline">Новый расход</Button>}
            />
            <PaymentFormDialog
              clients={clients.map((c) => ({ id: c.id, companyName: c.companyName }))}
              projects={projectsWithClient}
              trigger={
                <Button>
                  <Plus className="size-4" /> Новый платёж
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Переключение месяца */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" asChild>
          <Link href={monthHref(monthOffset - 1)} aria-label="Предыдущий месяц">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="min-w-40 text-center text-sm text-muted-foreground">
          {m.label}
        </span>
        <Button variant="outline" size="icon" className="size-8" asChild>
          <Link href={monthHref(monthOffset + 1)} aria-label="Следующий месяц">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        {monthOffset !== 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={monthHref(0)}>Сегодня</Link>
          </Button>
        )}
      </div>

      {/* Сводка месяца */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Доход · {m.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(m.income)}
            </span>
            {design === "v2" && (
              <TrendBadge current={m.income} previous={m.prevIncome} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Расход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold">{formatMoney(m.expenses)}</span>
              {design === "v2" && (
                <TrendBadge current={m.expenses} previous={m.prevExpenses} invert />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              вкл. зарплату по трекингу {formatMoney(m.salaryCost)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Прибыль
            </CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              "text-2xl font-bold",
              m.profit < 0
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatMoney(m.profit)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Дебиторка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(dashboard.receivablesTotal)}
            </div>
            {dashboard.overdueTotal > 0 && (
              <div className="text-xs font-medium text-destructive">
                просрочено {formatMoney(dashboard.overdueTotal)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* График по месяцам */}
        <Card>
          <CardHeader>
            <CardTitle>Доход и расход по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart
              months={dashboard.months}
              activeMonthOffset={monthOffset}
              tab={tab}
            />
          </CardContent>
        </Card>

        {/* Топ проектов по прибыли */}
        <Card>
          <CardHeader>
            <CardTitle>Топ проектов по прибыли</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.topProjects.map((p, i) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.clientName}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    p.profit < 0
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatMoney(p.profit)}
                </span>
              </Link>
            ))}
            {dashboard.topProjects.length === 0 && (
              <p className="text-sm text-muted-foreground">Проектов пока нет</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Дебиторка */}
      <Card>
        <CardHeader>
          <CardTitle>Дебиторка — кто должен и сколько</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.receivables.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ожидаемых платежей нет — все оплачено 🎉
            </p>
          )}
          {dashboard.receivables.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3",
                r.status === "OVERDUE" && "border-destructive/40 bg-destructive/5"
              )}
            >
              <div className="flex items-center gap-2">
                {r.status === "OVERDUE" && (
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                )}
                <div>
                  <div className="text-sm font-medium">{r.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.projectName ?? "Без проекта"} · срок {formatDate(r.dueDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {formatMoney(r.amount)}
                </span>
                <StatusBadge {...PAYMENT_STATUS[r.status]} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Таблицы: платежи / расходы */}
      <div className="space-y-3">
        <div className="flex rounded-lg border p-0.5 w-fit">
          <Link
            href={tabHref("payments")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "payments"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Доходы
          </Link>
          <Link
            href={tabHref("expenses")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "expenses"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Расходы
          </Link>
        </div>

        {tab === "payments" ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент / проект</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="hidden md:table-cell">Дата</TableHead>
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.client.companyName}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.project?.name ?? "Без проекта"}
                        {p.note && ` · ${p.note}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(p.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {PAYMENT_KIND[p.kind]}
                    </TableCell>
                    <TableCell>
                      <StatusBadge {...PAYMENT_STATUS[p.status]} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.status === "RECEIVED"
                        ? formatDate(p.paidAt)
                        : `срок ${formatDate(p.dueDate)}`}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <PaymentFormDialog
                            paymentId={p.id}
                            clients={clients.map((c) => ({
                              id: c.id,
                              companyName: c.companyName,
                            }))}
                            projects={projectsWithClient}
                            initial={{
                              clientId: p.clientId,
                              projectId: p.projectId ?? "",
                              amountMajor: toMajor(p.amount),
                              method: p.method ?? "",
                              kind: p.kind,
                              status: p.status,
                              dueDate: toDateInputValue(p.dueDate),
                              paidAt: toDateInputValue(p.paidAt),
                              note: p.note ?? "",
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Редактировать">
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <ConfirmDelete
                            title="Удалить платёж?"
                            action={deletePaymentAction.bind(null, p.id)}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Удалить">
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Категория / описание</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="hidden md:table-cell">Проект</TableHead>
                  <TableHead className="hidden sm:table-cell">Дата</TableHead>
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">
                        {EXPENSE_CATEGORY[e.category]}
                        {e.contractorName && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {e.contractorName}
                          </span>
                        )}
                      </div>
                      {e.description && (
                        <div className="text-xs text-muted-foreground">
                          {e.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(e.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {e.project?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(e.date)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <ExpenseFormDialog
                            expenseId={e.id}
                            projects={projectsRaw}
                            contractorNames={contractorNames}
                            initial={{
                              category: e.category,
                              amountMajor: toMajor(e.amount),
                              date: toDateInputValue(e.date),
                              projectId: e.projectId ?? "",
                              contractorName: e.contractorName ?? "",
                              description: e.description ?? "",
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Редактировать">
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <ConfirmDelete
                            title="Удалить расход?"
                            action={deleteExpenseAction.bind(null, e.id)}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Удалить">
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
