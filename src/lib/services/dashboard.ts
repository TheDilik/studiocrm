// Агрегация данных для главного дашборда. Переиспользует уже готовые
// role-scoped сервисы (задачи/проекты/финансы) — здесь только сборка и фильтрация.
import { prisma } from "@/lib/prisma";
import { canViewFinance, type SessionContext } from "@/lib/rbac";
import { listTasks } from "@/lib/services/tasks";
import { listProjects } from "@/lib/services/projects";
import { getFinanceDashboard } from "@/lib/services/finance";
import { formatMoney } from "@/lib/format";
import { INTERACTION_TYPE } from "@/lib/labels";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type ActivityItem = {
  id: string;
  text: string;
  date: Date;
};

async function getRecentActivity(ctx: SessionContext): Promise<ActivityItem[]> {
  if (ctx.role === "EMPLOYEE") {
    const doneTasks = await prisma.task.findMany({
      where: { organizationId: ctx.organizationId, assigneeId: ctx.userId, status: "DONE" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, updatedAt: true, project: { select: { name: true } } },
    });
    return doneTasks.map((t) => ({
      id: `task-${t.id}`,
      text: `Завершена задача «${t.title}» (${t.project.name})`,
      date: t.updatedAt,
    }));
  }

  const [interactions, doneTasks, payments] = await Promise.all([
    prisma.interaction.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        client: { select: { companyName: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: { organizationId: ctx.organizationId, status: "DONE" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { organizationId: ctx.organizationId, status: "RECEIVED" },
      orderBy: { paidAt: "desc" },
      take: 5,
      select: { id: true, amount: true, paidAt: true, client: { select: { companyName: true } } },
    }),
  ]);

  const items: ActivityItem[] = [
    ...interactions.map((i) => ({
      id: `int-${i.id}`,
      text: `${INTERACTION_TYPE[i.type]} с «${i.client.companyName}»${i.author?.name ? ` · ${i.author.name}` : ""}`,
      date: i.date,
    })),
    ...doneTasks.map((t) => ({
      id: `task-${t.id}`,
      text: `Завершена задача «${t.title}» (${t.project.name})${t.assignee?.name ? ` · ${t.assignee.name}` : ""}`,
      date: t.updatedAt,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      text: `Получен платёж ${formatMoney(p.amount)} от «${p.client.companyName}»`,
      date: p.paidAt!,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
}

export async function getDashboardData(ctx: SessionContext) {
  const now = new Date();

  const [tasks, projects, activity] = await Promise.all([
    listTasks(ctx, {}),
    listProjects(ctx, {}),
    getRecentActivity(ctx),
  ]);

  const todayTasks = tasks.filter(
    (t) => t.dueDate && isSameDay(new Date(t.dueDate), now) && t.status !== "DONE"
  );
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
  );
  const activeProjects = projects
    .filter((p) => p.status === "NEGOTIATION" || p.status === "IN_PROGRESS" || p.status === "ON_HOLD")
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 6);

  let finance: Awaited<ReturnType<typeof getFinanceDashboard>>["month"] | null = null;
  let overduePayments: Awaited<ReturnType<typeof getFinanceDashboard>>["receivables"] = [];

  if (canViewFinance(ctx.role)) {
    const dashboard = await getFinanceDashboard(ctx);
    finance = dashboard.month;
    overduePayments = dashboard.receivables.filter((r) => r.status === "OVERDUE");
  }

  return {
    todayTasks,
    overdueTasks,
    activeProjects,
    finance,
    overduePayments,
    activity,
    counts: {
      activeClients: await prisma.client.count({
        where: { organizationId: ctx.organizationId, status: "ACTIVE" },
      }),
      projectsInProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
      openTasks: tasks.filter((t) => t.status !== "DONE").length,
      employees: await prisma.employee.count({
        where: { organizationId: ctx.organizationId, isActive: true },
      }),
    },
  };
}
