// Финансы: платежи, расходы, дашборд, дебиторка, просрочка.
// Просмотр — OWNER и MANAGER, изменение — только OWNER.
import { prisma } from "@/lib/prisma";
import {
  canEditFinance,
  canViewFinance,
  ForbiddenError,
  type SessionContext,
} from "@/lib/rbac";
import type { ExpenseInput, PaymentInput } from "@/lib/validators/finance";
import { toMinor } from "@/lib/format";
import { createNotification } from "@/lib/services/notifications";

const emptyToNull = (v: string | undefined) => (v ? v : null);

/** Часов в месяце для пересчёта месячной ставки (как в рентабельности). */
const MONTHLY_HOURS = 160;

function assertView(ctx: SessionContext) {
  if (!canViewFinance(ctx.role)) throw new ForbiddenError();
}
function assertEdit(ctx: SessionContext) {
  if (!canEditFinance(ctx.role)) {
    throw new ForbiddenError("Изменение финансов доступно только владельцу");
  }
}

// ---------- Просрочка (фоновая проверка) ----------

/**
 * Помечает ожидаемые платежи с истёкшим сроком как OVERDUE и создаёт
 * уведомления владельцам. Вызывается при открытии финансов/дашборда —
 * до подключения полноценного крона.
 */
export async function checkOverduePayments(organizationId: string) {
  const now = new Date();
  const overdue = await prisma.payment.findMany({
    where: {
      organizationId,
      status: "EXPECTED",
      dueDate: { lt: now },
    },
    include: { client: { select: { companyName: true } } },
  });
  if (overdue.length === 0) return 0;

  await prisma.payment.updateMany({
    where: { id: { in: overdue.map((p) => p.id) } },
    data: { status: "OVERDUE" },
  });

  const owners = await prisma.membership.findMany({
    where: { organizationId, role: "OWNER" },
    select: { userId: true },
  });
  await Promise.all(
    overdue.flatMap((p) =>
      owners.map((o) =>
        createNotification({
          organizationId,
          userId: o.userId,
          type: "PAYMENT_OVERDUE",
          title: "Просрочен платёж",
          body: `${p.client.companyName}: ${(p.amount / 100).toLocaleString("ru-RU")} — срок ${p.dueDate!.toLocaleDateString("ru-RU")}`,
          entityType: "payment",
          entityId: p.id,
        })
      )
    )
  );
  return overdue.length;
}

// ---------- Платежи ----------

export async function listPayments(ctx: SessionContext) {
  assertView(ctx);
  return prisma.payment.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      client: { select: { id: true, companyName: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function createPayment(ctx: SessionContext, input: PaymentInput) {
  assertEdit(ctx);
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!client) throw new Error("Клиент не найден");

  const payment = await prisma.payment.create({
    data: {
      organizationId: ctx.organizationId,
      clientId: input.clientId,
      projectId: emptyToNull(input.projectId),
      amount: toMinor(input.amountMajor),
      method: emptyToNull(input.method),
      kind: input.kind,
      status: input.status,
      dueDate: input.dueDate ?? null,
      paidAt: input.status === "RECEIVED" ? (input.paidAt ?? new Date()) : null,
      note: emptyToNull(input.note),
    },
  });

  // Уведомление о полученном платеже
  if (payment.status === "RECEIVED") {
    const owners = await prisma.membership.findMany({
      where: { organizationId: ctx.organizationId, role: "OWNER" },
      select: { userId: true },
    });
    await Promise.all(
      owners.map((o) =>
        createNotification({
          organizationId: ctx.organizationId,
          userId: o.userId,
          type: "PAYMENT_RECEIVED",
          title: "Получен платёж",
          body: `${(payment.amount / 100).toLocaleString("ru-RU")}`,
          entityType: "payment",
          entityId: payment.id,
        })
      )
    );
  }
  return payment;
}

export async function updatePayment(
  ctx: SessionContext,
  id: string,
  input: PaymentInput
) {
  assertEdit(ctx);
  const { count } = await prisma.payment.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      clientId: input.clientId,
      projectId: emptyToNull(input.projectId),
      amount: toMinor(input.amountMajor),
      method: emptyToNull(input.method),
      kind: input.kind,
      status: input.status,
      dueDate: input.dueDate ?? null,
      paidAt: input.status === "RECEIVED" ? (input.paidAt ?? new Date()) : null,
      note: emptyToNull(input.note),
    },
  });
  if (count === 0) throw new Error("Платёж не найден");
}

export async function deletePayment(ctx: SessionContext, id: string) {
  assertEdit(ctx);
  const { count } = await prisma.payment.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Платёж не найден");
}

// ---------- Расходы ----------

export async function listExpenses(ctx: SessionContext) {
  assertView(ctx);
  return prisma.expense.findMany({
    where: { organizationId: ctx.organizationId },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });
}

/** Уникальные имена исполнителей-подрядчиков — подсказки при вводе. */
export async function listContractorNames(ctx: SessionContext) {
  assertView(ctx);
  const rows = await prisma.expense.findMany({
    where: { organizationId: ctx.organizationId, contractorName: { not: null } },
    select: { contractorName: true },
    distinct: ["contractorName"],
  });
  return rows.map((r) => r.contractorName!).filter(Boolean);
}

export async function createExpense(ctx: SessionContext, input: ExpenseInput) {
  assertEdit(ctx);
  return prisma.expense.create({
    data: {
      organizationId: ctx.organizationId,
      category: input.category,
      amount: toMinor(input.amountMajor),
      date: input.date,
      projectId: emptyToNull(input.projectId),
      contractorName: emptyToNull(input.contractorName),
      description: emptyToNull(input.description),
    },
  });
}

export async function updateExpense(
  ctx: SessionContext,
  id: string,
  input: ExpenseInput
) {
  assertEdit(ctx);
  const { count } = await prisma.expense.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      category: input.category,
      amount: toMinor(input.amountMajor),
      date: input.date,
      projectId: emptyToNull(input.projectId),
      contractorName: emptyToNull(input.contractorName),
      description: emptyToNull(input.description),
    },
  });
  if (count === 0) throw new Error("Расход не найден");
}

export async function deleteExpense(ctx: SessionContext, id: string) {
  assertEdit(ctx);
  const { count } = await prisma.expense.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Расход не найден");
}

// ---------- Дашборд ----------

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Зарплатная себестоимость за период: минуты трекинга × часовая ставка. */
async function salaryCostForPeriod(
  organizationId: string,
  from: Date,
  to: Date
): Promise<number> {
  const entries = await prisma.timeEntry.groupBy({
    by: ["userId"],
    where: {
      organizationId,
      date: { gte: from, lt: to },
      isRunning: false,
    },
    _sum: { minutes: true },
  });
  if (entries.length === 0) return 0;

  const employees = await prisma.employee.findMany({
    where: { organizationId, userId: { in: entries.map((e) => e.userId) } },
    select: { userId: true, rateType: true, rateAmount: true },
  });
  const rateByUser = new Map(
    employees.map((e) => [
      e.userId!,
      e.rateType === "HOURLY" ? e.rateAmount : Math.round(e.rateAmount / MONTHLY_HOURS),
    ])
  );

  return entries.reduce((sum, e) => {
    const rate = rateByUser.get(e.userId) ?? 0;
    return sum + Math.round(((e._sum.minutes ?? 0) / 60) * rate);
  }, 0);
}

export async function getFinanceDashboard(ctx: SessionContext, monthOffset = 0) {
  assertView(ctx);
  const organizationId = ctx.organizationId;
  const now = new Date();
  const thisMonth = addMonths(monthStart(now), monthOffset);
  const nextMonth = addMonths(thisMonth, 1);

  // Текущий месяц
  const [incomeAgg, expenseAgg, salaryCost] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        organizationId,
        status: "RECEIVED",
        paidAt: { gte: thisMonth, lt: nextMonth },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { organizationId, date: { gte: thisMonth, lt: nextMonth } },
      _sum: { amount: true },
    }),
    salaryCostForPeriod(organizationId, thisMonth, nextMonth),
  ]);

  const income = incomeAgg._sum.amount ?? 0;
  // Расходы месяца = прямые расходы + авторасчёт зарплатной части по трекингу
  const expenses = (expenseAgg._sum.amount ?? 0) + salaryCost;

  // Прошлый месяц той же формулой — для трендовых бейджей «% к прошлому месяцу»
  const prevMonth = addMonths(thisMonth, -1);
  const [prevIncomeAgg, prevExpenseAgg, prevSalaryCost] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        organizationId,
        status: "RECEIVED",
        paidAt: { gte: prevMonth, lt: thisMonth },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { organizationId, date: { gte: prevMonth, lt: thisMonth } },
      _sum: { amount: true },
    }),
    salaryCostForPeriod(organizationId, prevMonth, thisMonth),
  ]);
  const prevIncome = prevIncomeAgg._sum.amount ?? 0;
  const prevExpenses = (prevExpenseAgg._sum.amount ?? 0) + prevSalaryCost;

  // График 12 месяцев
  const chartStart = addMonths(thisMonth, -11);
  const [payments12, expenses12] = await Promise.all([
    prisma.payment.findMany({
      where: {
        organizationId,
        status: "RECEIVED",
        paidAt: { gte: chartStart, lt: nextMonth },
      },
      select: { amount: true, paidAt: true },
    }),
    prisma.expense.findMany({
      where: { organizationId, date: { gte: chartStart, lt: nextMonth } },
      select: { amount: true, date: true },
    }),
  ]);

  const months: {
    key: string;
    label: string;
    income: number;
    expense: number;
    monthOffset: number;
  }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = addMonths(chartStart, i);
    months.push({
      key: `${m.getFullYear()}-${m.getMonth()}`,
      label: m.toLocaleDateString("ru-RU", { month: "short" }),
      income: 0,
      expense: 0,
      // Смещение от текущего реального месяца — для ссылки-клика по столбцу
      monthOffset: monthOffset - 11 + i,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const p of payments12) {
    const d = p.paidAt!;
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx != null) months[idx].income += p.amount;
  }
  for (const e of expenses12) {
    const idx = monthIndex.get(`${e.date.getFullYear()}-${e.date.getMonth()}`);
    if (idx != null) months[idx].expense += e.amount;
  }

  // Топ проектов по прибыли (бюджет − зарплата по трекингу − прямые расходы)
  const projects = await prisma.project.findMany({
    where: { organizationId, status: { notIn: ["CANCELLED"] } },
    select: {
      id: true,
      name: true,
      budget: true,
      client: { select: { companyName: true } },
    },
  });
  const [projectEntries, projectExpenses, employees] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { organizationId, isRunning: false },
      select: { minutes: true, userId: true, task: { select: { projectId: true } } },
    }),
    prisma.expense.groupBy({
      by: ["projectId"],
      where: { organizationId, projectId: { not: null }, category: { not: "SALARY" } },
      _sum: { amount: true },
    }),
    prisma.employee.findMany({
      where: { organizationId, userId: { not: null } },
      select: { userId: true, rateType: true, rateAmount: true },
    }),
  ]);
  const rateByUser = new Map(
    employees.map((e) => [
      e.userId!,
      e.rateType === "HOURLY" ? e.rateAmount : Math.round(e.rateAmount / MONTHLY_HOURS),
    ])
  );
  const salaryByProject = new Map<string, number>();
  for (const e of projectEntries) {
    const cost = Math.round((e.minutes / 60) * (rateByUser.get(e.userId) ?? 0));
    salaryByProject.set(
      e.task.projectId,
      (salaryByProject.get(e.task.projectId) ?? 0) + cost
    );
  }
  const expenseByProject = new Map(
    projectExpenses.map((e) => [e.projectId!, e._sum.amount ?? 0])
  );
  const topProjects = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.client.companyName,
      budget: p.budget,
      profit:
        p.budget -
        (salaryByProject.get(p.id) ?? 0) -
        (expenseByProject.get(p.id) ?? 0),
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Дебиторка: ожидаемые и просроченные платежи по клиентам
  const receivables = await prisma.payment.findMany({
    where: { organizationId, status: { in: ["EXPECTED", "OVERDUE"] } },
    include: {
      client: { select: { id: true, companyName: true } },
      project: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
  const receivablesTotal = receivables.reduce((s, p) => s + p.amount, 0);
  const overdueTotal = receivables
    .filter((p) => p.status === "OVERDUE")
    .reduce((s, p) => s + p.amount, 0);

  return {
    month: {
      income,
      expenses,
      salaryCost,
      profit: income - expenses,
      prevIncome,
      prevExpenses,
      label: (() => {
        const s = thisMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
        return s.charAt(0).toUpperCase() + s.slice(1);
      })(),
    },
    months,
    topProjects,
    receivables: receivables.map((p) => ({
      id: p.id,
      clientName: p.client.companyName,
      projectName: p.project?.name ?? null,
      amount: p.amount,
      dueDate: p.dueDate,
      status: p.status,
    })),
    receivablesTotal,
    overdueTotal,
  };
}
