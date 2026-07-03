// Сервисный слой задач. EMPLOYEE видит задачи только своих проектов,
// менять может задачи, назначенные на него (или в своих проектах).
import { prisma } from "@/lib/prisma";
import { canManageClients, ForbiddenError, type SessionContext } from "@/lib/rbac";
import type { MoveTaskInput, TaskFilters, TaskInput } from "@/lib/validators/task";
import { createNotification } from "@/lib/services/notifications";

const emptyToNull = (v: string | undefined) => (v ? v : null);

/** Доступ к проектам для EMPLOYEE — участник или менеджер. */
function projectScope(ctx: SessionContext) {
  if (ctx.role === "EMPLOYEE") {
    return {
      project: {
        is: {
          OR: [
            { managerId: ctx.userId },
            { members: { some: { userId: ctx.userId } } },
          ],
        },
      },
    };
  }
  return {};
}

export async function listTasks(ctx: SessionContext, filters: TaskFilters) {
  return prisma.task.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...projectScope(ctx),
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters.q && { title: { contains: filters.q, mode: "insensitive" } }),
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      timeEntries: {
        where: { isRunning: true },
        select: { id: true, userId: true, startedAt: true },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

async function assertTaskAccess(ctx: SessionContext, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: ctx.organizationId, ...projectScope(ctx) },
    select: { id: true, projectId: true, assigneeId: true },
  });
  if (!task) throw new Error("Задача не найдена");
  return task;
}

export async function createTask(ctx: SessionContext, input: TaskInput) {
  // EMPLOYEE может создавать задачи только в своих проектах
  if (ctx.role === "EMPLOYEE") {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        organizationId: ctx.organizationId,
        OR: [
          { managerId: ctx.userId },
          { members: { some: { userId: ctx.userId } } },
        ],
      },
      select: { id: true },
    });
    if (!project) throw new ForbiddenError();
  } else {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!project) throw new Error("Проект не найден");
  }

  const last = await prisma.task.findFirst({
    where: { projectId: input.projectId, status: input.status },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      title: input.title,
      description: emptyToNull(input.description),
      assigneeId: emptyToNull(input.assigneeId),
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate ?? null,
      order: (last?.order ?? 0) + 1,
    },
  });

  if (task.assigneeId && task.assigneeId !== ctx.userId) {
    await createNotification({
      organizationId: ctx.organizationId,
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: "Вам назначена задача",
      body: task.title,
      entityType: "task",
      entityId: task.id,
    });
  }
  return task;
}

export async function updateTask(ctx: SessionContext, taskId: string, input: TaskInput) {
  const existing = await assertTaskAccess(ctx, taskId);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      projectId: input.projectId,
      title: input.title,
      description: emptyToNull(input.description),
      assigneeId: emptyToNull(input.assigneeId),
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate ?? null,
    },
  });

  const newAssignee = emptyToNull(input.assigneeId);
  if (newAssignee && newAssignee !== existing.assigneeId && newAssignee !== ctx.userId) {
    await createNotification({
      organizationId: ctx.organizationId,
      userId: newAssignee,
      type: "TASK_ASSIGNED",
      title: "Вам назначена задача",
      body: task.title,
      entityType: "task",
      entityId: task.id,
    });
  }
  return task;
}

export async function deleteTask(ctx: SessionContext, taskId: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.task.deleteMany({
    where: { id: taskId, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Задача не найдена");
}

/** Перенос по канбану: статус + переупорядочивание целевой колонки. */
export async function moveTask(ctx: SessionContext, input: MoveTaskInput) {
  await assertTaskAccess(ctx, input.taskId);

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { id: input.taskId, organizationId: ctx.organizationId },
      data: { status: input.status },
    }),
    ...input.orderedIds.map((id, index) =>
      prisma.task.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { order: index },
      })
    ),
  ]);
}

/** Проекты, доступные пользователю (для селектов задач). */
export async function listAccessibleProjects(ctx: SessionContext) {
  return prisma.project.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: { notIn: ["CANCELLED"] },
      ...(ctx.role === "EMPLOYEE"
        ? {
            OR: [
              { managerId: ctx.userId },
              { members: { some: { userId: ctx.userId } } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
