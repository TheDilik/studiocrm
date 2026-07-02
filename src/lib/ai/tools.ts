// Инструменты (tool use) для AI-помощника. Каждый инструмент выполняется
// в контексте текущего пользователя и фильтруется по organizationId/роли —
// та же дисциплина, что и в сервисном слое приложения.
import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { canViewFinance, type SessionContext } from "@/lib/rbac";
import { listProjects, computeProfitability } from "@/lib/services/projects";
import { listTasks } from "@/lib/services/tasks";
import { getFinanceDashboard, listPayments } from "@/lib/services/finance";
import { listClients } from "@/lib/services/clients";
import { formatDate, formatHours, formatMoney } from "@/lib/format";
import { PROJECT_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/lib/labels";

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_overdue_tasks",
    description:
      "Возвращает список просроченных задач (дедлайн прошёл, статус не «готово»). Используй, когда спрашивают о просроченных задачах или что горит.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_overdue_payments",
    description:
      "Возвращает список просроченных и ожидаемых платежей от клиентов (дебиторка). Только для владельца и менеджера.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_project_profitability",
    description:
      "Считает рентабельность проекта: бюджет минус зарплатные расходы (по трекингу времени) и прямые расходы. Найди проект по названию (частичное совпадение).",
    input_schema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Название проекта или его часть",
        },
      },
      required: ["projectName"],
    },
  },
  {
    name: "get_week_summary",
    description:
      "Сводка по текущей неделе: сколько задач в работе/готово, сколько часов отработано командой, финансовая сводка месяца (если доступна роли).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_clients",
    description:
      "Список клиентов организации с их статусом (лид/в переговорах/активный/архив) и количеством проектов.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_projects",
    description: "Список всех проектов, доступных пользователю, со статусами и бюджетами.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_employee_workload",
    description:
      "Загрузка сотрудников: сколько открытых задач и часов за текущую неделю у каждого. Только для владельца и менеджера.",
    input_schema: { type: "object", properties: {} },
  },
];

type ToolResult = { content: string };

async function toolGetOverdueTasks(ctx: SessionContext): Promise<ToolResult> {
  const tasks = await listTasks(ctx, {});
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
  );
  if (overdue.length === 0) return { content: "Просроченных задач нет." };
  const lines = overdue.map(
    (t) =>
      `- «${t.title}» (проект: ${t.project.name}, исполнитель: ${t.assignee?.name ?? "не назначен"}, дедлайн: ${formatDate(t.dueDate)}, статус: ${TASK_STATUS[t.status].label}, приоритет: ${TASK_PRIORITY[t.priority].label})`
  );
  return { content: `Просроченные задачи (${overdue.length}):\n${lines.join("\n")}` };
}

async function toolGetOverduePayments(ctx: SessionContext): Promise<ToolResult> {
  if (!canViewFinance(ctx.role)) {
    return { content: "У текущего пользователя нет доступа к финансовым данным." };
  }
  const payments = await listPayments(ctx);
  const problematic = payments.filter((p) => p.status !== "RECEIVED");
  if (problematic.length === 0) return { content: "Все платежи получены, дебиторки нет." };
  const lines = problematic.map(
    (p) =>
      `- ${p.client.companyName}${p.project ? ` (${p.project.name})` : ""}: ${formatMoney(p.amount)}, срок ${formatDate(p.dueDate)}, статус: ${p.status === "OVERDUE" ? "просрочен" : "ожидается"}`
  );
  return { content: `Неоплаченные платежи (${problematic.length}):\n${lines.join("\n")}` };
}

async function toolGetProjectProfitability(
  ctx: SessionContext,
  input: { projectName?: string }
): Promise<ToolResult> {
  if (!canViewFinance(ctx.role)) {
    return { content: "У текущего пользователя нет доступа к финансовым данным." };
  }
  const name = input.projectName?.trim();
  if (!name) return { content: "Не указано название проекта." };

  const project = await prisma.project.findFirst({
    where: {
      organizationId: ctx.organizationId,
      name: { contains: name, mode: "insensitive" },
    },
    select: { id: true, name: true, budget: true, client: { select: { companyName: true } } },
  });
  if (!project) return { content: `Проект с названием, похожим на «${name}», не найден.` };

  const p = await computeProfitability(ctx, project.id, project.budget);
  return {
    content: [
      `Проект «${project.name}» (клиент: ${project.client.companyName})`,
      `Бюджет: ${formatMoney(p.budget)}`,
      `Зарплатные расходы (по трекингу): ${formatMoney(p.salaryCost)} (${formatHours(p.trackedMinutes)})`,
      `Прямые расходы: ${formatMoney(p.directExpenses)}`,
      `Прибыль: ${formatMoney(p.profit)}`,
      `Маржа: ${p.marginPercent}%`,
    ].join("\n"),
  };
}

async function toolGetWeekSummary(ctx: SessionContext): Promise<ToolResult> {
  const tasks = await listTasks(ctx, {});
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const review = tasks.filter((t) => t.status === "REVIEW").length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const backlog = tasks.filter((t) => t.status === "BACKLOG").length;

  const lines = [
    `Задачи: бэклог ${backlog}, в работе ${inProgress}, на проверке ${review}, готово ${done}.`,
  ];

  if (canViewFinance(ctx.role)) {
    const dashboard = await getFinanceDashboard(ctx);
    lines.push(
      `Финансы за ${dashboard.month.label.toLowerCase()}: доход ${formatMoney(dashboard.month.income)}, расход ${formatMoney(dashboard.month.expenses)}, прибыль ${formatMoney(dashboard.month.profit)}.`
    );
    if (dashboard.overdueTotal > 0) {
      lines.push(`Просрочено платежей на сумму ${formatMoney(dashboard.overdueTotal)}.`);
    }
  }
  return { content: lines.join("\n") };
}

async function toolListClients(ctx: SessionContext): Promise<ToolResult> {
  const clients = await listClients(ctx, {});
  if (clients.length === 0) return { content: "Клиентов пока нет." };
  const lines = clients.map(
    (c) => `- ${c.companyName}: ${c.status}, проектов: ${c._count.projects}`
  );
  return { content: lines.join("\n") };
}

async function toolListProjects(ctx: SessionContext): Promise<ToolResult> {
  const projects = await listProjects(ctx, {});
  if (projects.length === 0) return { content: "Проектов пока нет." };
  const lines = projects.map(
    (p) =>
      `- «${p.name}» (${p.client.companyName}): ${PROJECT_STATUS[p.status].label}, бюджет ${formatMoney(p.budget)}`
  );
  return { content: lines.join("\n") };
}

async function toolGetEmployeeWorkload(ctx: SessionContext): Promise<ToolResult> {
  if (!canViewFinance(ctx.role)) {
    return { content: "У текущего пользователя нет доступа к этим данным." };
  }
  const { listEmployees } = await import("@/lib/services/employees");
  const employees = await listEmployees(ctx);
  const lines = employees
    .filter((e) => e.isActive)
    .map(
      (e) =>
        `- ${e.fullName}: открытых задач ${e.openTasks}, отработано за неделю ${formatHours(e.weekMinutes)}${e.absentType ? " (отсутствует)" : ""}`
    );
  return { content: lines.join("\n") || "Активных сотрудников нет." };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: SessionContext
): Promise<string> {
  try {
    switch (name) {
      case "get_overdue_tasks":
        return (await toolGetOverdueTasks(ctx)).content;
      case "get_overdue_payments":
        return (await toolGetOverduePayments(ctx)).content;
      case "get_project_profitability":
        return (await toolGetProjectProfitability(ctx, input)).content;
      case "get_week_summary":
        return (await toolGetWeekSummary(ctx)).content;
      case "list_clients":
        return (await toolListClients(ctx)).content;
      case "list_projects":
        return (await toolListProjects(ctx)).content;
      case "get_employee_workload":
        return (await toolGetEmployeeWorkload(ctx)).content;
      default:
        return `Неизвестный инструмент: ${name}`;
    }
  } catch (error) {
    return `Ошибка при выполнении: ${error instanceof Error ? error.message : "неизвестная ошибка"}`;
  }
}
