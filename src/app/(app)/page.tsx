import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  ListTodo,
  Users,
  Wallet,
} from "lucide-react";
import { canManageClients, requireSession } from "@/lib/rbac";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatDate, formatMoney } from "@/lib/format";
import { PROJECT_STATUS, TASK_PRIORITY } from "@/lib/labels";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Дашборд — StudioCRM" };

export default async function DashboardPage() {
  const ctx = await requireSession();
  const data = await getDashboardData(ctx);

  const canSeeClientsAndEmployees = canManageClients(ctx.role);
  const kpiCards = [
    {
      title: "Активные клиенты",
      value: data.counts.activeClients,
      icon: Users,
      href: canSeeClientsAndEmployees ? "/clients" : null,
    },
    { title: "Проекты в работе", value: data.counts.projectsInProgress, icon: FolderKanban, href: "/projects" },
    { title: "Открытые задачи", value: data.counts.openTasks, icon: ListTodo, href: "/tasks" },
    {
      title: "Сотрудники",
      value: data.counts.employees,
      icon: Wallet,
      href: canSeeClientsAndEmployees ? "/employees" : null,
    },
  ];

  const overdueCount = data.overdueTasks.length + data.overduePayments.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>

      {/* KPI-плитки */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((c) => {
          const card = (
            <Card className={cn(c.href && "transition-shadow hover:shadow-md")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
                <c.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
          return c.href ? (
            <Link key={c.title} href={c.href}>
              {card}
            </Link>
          ) : (
            <div key={c.title}>{card}</div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Финансовая сводка — только владелец/менеджер */}
        {data.finance && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Финансы · {data.finance.label}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Доход</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(data.finance.income)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Расход</div>
                <div className="text-lg font-bold">{formatMoney(data.finance.expenses)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Прибыль</div>
                <div
                  className={cn(
                    "text-lg font-bold",
                    data.finance.profit < 0
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatMoney(data.finance.profit)}
                </div>
              </div>
              <Link
                href="/finance"
                className="col-span-3 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Подробнее в финансах →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Просроченное */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Требует внимания
              {overdueCount > 0 && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                  {overdueCount}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueCount === 0 && (
              <p className="text-sm text-muted-foreground">Просроченного нет 🎉</p>
            )}
            {data.overdueTasks.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href="/tasks"
                className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm hover:bg-destructive/10"
              >
                <span className="truncate">
                  «{t.title}» — {t.project.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(t.dueDate)}
                </span>
              </Link>
            ))}
            {data.overduePayments.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href="/finance"
                className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm hover:bg-destructive/10"
              >
                <span className="truncate">{p.clientName} — платёж просрочен</span>
                <span className="shrink-0 text-xs font-medium">{formatMoney(p.amount)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Активные проекты */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Активные проекты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.activeProjects.length === 0 && (
              <p className="text-sm text-muted-foreground">Активных проектов нет</p>
            )}
            {data.activeProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.client.companyName} · до {formatDate(p.deadline)}
                  </div>
                </div>
                <StatusBadge {...PROJECT_STATUS[p.status]} />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Задачи на сегодня */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> Задачи на сегодня
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.todayTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">На сегодня задач нет</p>
            )}
            {data.todayTasks.map((t) => (
              <Link
                key={t.id}
                href="/tasks"
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.project.name}
                    {t.assignee?.name && ` · ${t.assignee.name}`}
                  </div>
                </div>
                <StatusBadge {...TASK_PRIORITY[t.priority]} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Последняя активность */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последняя активность</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.activity.length === 0 && (
            <p className="text-sm text-muted-foreground">Активности пока нет</p>
          )}
          {data.activity.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span>{item.text}</span>
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
