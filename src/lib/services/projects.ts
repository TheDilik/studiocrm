// Сервисный слой проектов. Сотрудник видит только проекты, где он в команде или менеджер.
import { prisma } from "@/lib/prisma";
import { canManageClients, ForbiddenError, type SessionContext } from "@/lib/rbac";
import type { MilestoneInput, ProjectFilters, ProjectInput } from "@/lib/validators/project";
import { toMinor } from "@/lib/format";

const emptyToNull = (v: string | undefined) => (v ? v : null);

/** Часов в месяце для пересчёта месячной ставки в часовую (зарплатная себестоимость). */
const MONTHLY_HOURS = 160;

function memberScope(ctx: SessionContext) {
  // OWNER и MANAGER видят все проекты организации, EMPLOYEE — только свои
  if (ctx.role === "EMPLOYEE") {
    return {
      OR: [
        { managerId: ctx.userId },
        { members: { some: { userId: ctx.userId } } },
      ],
    };
  }
  return {};
}

export async function listProjects(ctx: SessionContext, filters: ProjectFilters) {
  return prisma.project.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...memberScope(ctx),
      ...(filters.status && { status: filters.status }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.q && { name: { contains: filters.q, mode: "insensitive" } }),
    },
    include: {
      client: { select: { id: true, companyName: true } },
      manager: { select: { id: true, name: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(ctx: SessionContext, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, organizationId: ctx.organizationId, ...memberScope(ctx) },
    include: {
      client: { select: { id: true, companyName: true } },
      manager: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      milestones: {
        orderBy: { order: "asc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true, email: true } } },
          },
        },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
      },
    },
  });
  if (!project) return null;

  const profitability = await computeProfitability(ctx, id, project.budget);
  return { ...project, profitability };
}

/**
 * Рентабельность: бюджет − (зарплатная себестоимость по трекингу + прямые расходы).
 * Зарплатная часть: минуты × часовая ставка (для месячной ставки — ставка/160ч).
 */
export async function computeProfitability(
  ctx: SessionContext,
  projectId: string,
  budget: number
) {
  const [entries, directExpenses] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        organizationId: ctx.organizationId,
        task: { projectId },
      },
      select: { minutes: true, userId: true },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId: ctx.organizationId,
        projectId,
        category: { not: "SALARY" }, // авто-зарплату считаем из трекинга, не дублируем
      },
      _sum: { amount: true },
    }),
  ]);

  // Ставки сотрудников по userId
  const userIds = [...new Set(entries.map((e) => e.userId))];
  const employees = await prisma.employee.findMany({
    where: { organizationId: ctx.organizationId, userId: { in: userIds } },
    select: { userId: true, rateType: true, rateAmount: true },
  });
  const rateByUser = new Map(
    employees.map((e) => [
      e.userId!,
      e.rateType === "HOURLY" ? e.rateAmount : Math.round(e.rateAmount / MONTHLY_HOURS),
    ])
  );

  let salaryCost = 0;
  let trackedMinutes = 0;
  for (const entry of entries) {
    trackedMinutes += entry.minutes;
    const hourlyRate = rateByUser.get(entry.userId) ?? 0;
    salaryCost += Math.round((entry.minutes / 60) * hourlyRate);
  }

  const expenses = directExpenses._sum.amount ?? 0;
  const totalCost = salaryCost + expenses;

  return {
    budget,
    salaryCost,
    directExpenses: expenses,
    totalCost,
    profit: budget - totalCost,
    marginPercent: budget > 0 ? Math.round(((budget - totalCost) / budget) * 100) : 0,
    trackedMinutes,
  };
}

export async function createProject(ctx: SessionContext, input: ProjectInput) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  // Клиент должен принадлежать организации
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!client) throw new Error("Клиент не найден");

  return prisma.project.create({
    data: {
      organizationId: ctx.organizationId,
      clientId: input.clientId,
      name: input.name,
      type: input.type,
      budget: toMinor(input.budgetMajor),
      startDate: input.startDate ?? null,
      deadline: input.deadline ?? null,
      status: input.status,
      managerId: emptyToNull(input.managerId),
      members: {
        create: (input.memberIds ?? []).map((userId) => ({ userId })),
      },
    },
  });
}

export async function updateProject(ctx: SessionContext, id: string, input: ProjectInput) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Проект не найден");

  await prisma.$transaction([
    prisma.projectMember.deleteMany({ where: { projectId: id } }),
    prisma.project.update({
      where: { id },
      data: {
        clientId: input.clientId,
        name: input.name,
        type: input.type,
        budget: toMinor(input.budgetMajor),
        startDate: input.startDate ?? null,
        deadline: input.deadline ?? null,
        status: input.status,
        managerId: emptyToNull(input.managerId),
        members: {
          create: (input.memberIds ?? []).map((userId) => ({ userId })),
        },
      },
    }),
  ]);
}

export async function deleteProject(ctx: SessionContext, id: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.project.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Проект не найден");
}

// --- Этапы ---

async function assertProjectInOrg(ctx: SessionContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!project) throw new Error("Проект не найден");
}

export async function addMilestone(
  ctx: SessionContext,
  projectId: string,
  input: MilestoneInput
) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  await assertProjectInOrg(ctx, projectId);

  const last = await prisma.milestone.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.milestone.create({
    data: {
      organizationId: ctx.organizationId,
      projectId,
      name: input.name,
      description: emptyToNull(input.description),
      dueDate: input.dueDate ?? null,
      amount: input.amountMajor != null ? toMinor(input.amountMajor) : null,
      status: input.status,
      order: (last?.order ?? 0) + 1,
    },
  });
}

export async function updateMilestone(
  ctx: SessionContext,
  milestoneId: string,
  input: MilestoneInput
) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const { count } = await prisma.milestone.updateMany({
    where: { id: milestoneId, organizationId: ctx.organizationId },
    data: {
      name: input.name,
      description: emptyToNull(input.description),
      dueDate: input.dueDate ?? null,
      amount: input.amountMajor != null ? toMinor(input.amountMajor) : null,
      status: input.status,
    },
  });
  if (count === 0) throw new Error("Этап не найден");
}

export async function deleteMilestone(ctx: SessionContext, milestoneId: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.milestone.deleteMany({
    where: { id: milestoneId, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Этап не найден");
}

// --- Комментарии и согласование этапов (общие для сотрудников и портала клиента) ---

/** Проверяет доступ к этапу: сотрудник — по своему проекту, клиент — по своей карточке. */
async function assertMilestoneAccess(ctx: SessionContext, milestoneId: string) {
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, organizationId: ctx.organizationId },
    include: {
      project: {
        select: {
          clientId: true,
          managerId: true,
          members: { select: { userId: true } },
        },
      },
    },
  });
  if (!milestone) throw new Error("Этап не найден");

  if (ctx.role === "CLIENT") {
    const client = await prisma.client.findFirst({
      where: { organizationId: ctx.organizationId, portalUserId: ctx.userId },
      select: { id: true },
    });
    if (!client || client.id !== milestone.project.clientId) throw new ForbiddenError();
  } else if (ctx.role === "EMPLOYEE") {
    const allowed =
      milestone.project.managerId === ctx.userId ||
      milestone.project.members.some((m) => m.userId === ctx.userId);
    if (!allowed) throw new ForbiddenError();
  }
  return milestone;
}

export async function listMilestoneComments(ctx: SessionContext, milestoneId: string) {
  await assertMilestoneAccess(ctx, milestoneId);
  return prisma.milestoneComment.findMany({
    where: { milestoneId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, email: true } } },
  });
}

export async function addMilestoneComment(
  ctx: SessionContext,
  milestoneId: string,
  body: string
) {
  await assertMilestoneAccess(ctx, milestoneId);
  return prisma.milestoneComment.create({
    data: { milestoneId, authorId: ctx.userId, body },
    include: { author: { select: { name: true, email: true } } },
  });
}

/** Согласовать этап может только клиент — владелец проекта в портале. */
export async function approveMilestone(ctx: SessionContext, milestoneId: string) {
  if (ctx.role !== "CLIENT") {
    throw new ForbiddenError("Согласовать этап может только клиент в портале");
  }
  await assertMilestoneAccess(ctx, milestoneId);
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: "APPROVED" },
  });
}

/** Пользователи организации для селектов (менеджер, команда). */
export async function listOrgUsers(ctx: SessionContext) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: ctx.organizationId, role: { not: "CLIENT" } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email,
    role: m.role,
  }));
}
