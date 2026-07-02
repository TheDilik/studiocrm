// Трекинг времени: таймер (один активный на пользователя) и ручные записи.
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/lib/rbac";
import type { ManualTimeInput } from "@/lib/validators/task";

async function assertTaskInOrg(ctx: SessionContext, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!task) throw new Error("Задача не найдена");
}

/** Активный таймер пользователя (если есть). */
export async function getRunningEntry(ctx: SessionContext) {
  return prisma.timeEntry.findFirst({
    where: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      isRunning: true,
    },
    include: {
      task: { select: { id: true, title: true, project: { select: { name: true } } } },
    },
  });
}

/** Запуск таймера. Если другой уже идёт — останавливаем его. */
export async function startTimer(ctx: SessionContext, taskId: string) {
  await assertTaskInOrg(ctx, taskId);
  await stopTimer(ctx); // не более одного активного

  return prisma.timeEntry.create({
    data: {
      organizationId: ctx.organizationId,
      taskId,
      userId: ctx.userId,
      startedAt: new Date(),
      isRunning: true,
      date: new Date(),
    },
  });
}

/** Остановка активного таймера: фиксируем минуты. */
export async function stopTimer(ctx: SessionContext) {
  const running = await prisma.timeEntry.findFirst({
    where: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      isRunning: true,
    },
  });
  if (!running) return null;

  const endedAt = new Date();
  const minutes = Math.max(
    1,
    Math.round((endedAt.getTime() - running.startedAt!.getTime()) / 60_000)
  );

  return prisma.timeEntry.update({
    where: { id: running.id },
    data: { endedAt, minutes, isRunning: false },
  });
}

/** Ручное внесение времени задним числом. */
export async function addManualTime(ctx: SessionContext, input: ManualTimeInput) {
  await assertTaskInOrg(ctx, input.taskId);
  const minutes = Math.round(input.hours * 60 + input.minutes);
  if (minutes <= 0) throw new Error("Укажите время больше нуля");

  return prisma.timeEntry.create({
    data: {
      organizationId: ctx.organizationId,
      taskId: input.taskId,
      userId: ctx.userId,
      minutes,
      isManual: true,
      description: input.description || null,
      date: input.date,
    },
  });
}

export async function deleteTimeEntry(ctx: SessionContext, id: string) {
  // Свою запись может удалить каждый; чужую — владелец/менеджер
  const where =
    ctx.role === "EMPLOYEE"
      ? { id, organizationId: ctx.organizationId, userId: ctx.userId }
      : { id, organizationId: ctx.organizationId };
  const { count } = await prisma.timeEntry.deleteMany({ where });
  if (count === 0) throw new Error("Запись не найдена");
}

// ---------- Сводки ----------

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Пн = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Ключ дня в ЛОКАЛЬНОМ времени (не UTC!) — иначе сдвиг на день для UTC+ поясов. */
export const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const dayKey = localDayKey;

/**
 * Сводка недели: по каждому пользователю — задачи с дедлайном по дням
 * и отработанные минуты по дням.
 */
export async function getWeekBoard(ctx: SessionContext, weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);

  // EMPLOYEE видит только себя
  const userFilter = ctx.role === "EMPLOYEE" ? { userId: ctx.userId } : {};

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: ctx.organizationId,
      role: { not: "CLIENT" },
      ...(ctx.role === "EMPLOYEE" ? { userId: ctx.userId } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const [tasks, entries] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        dueDate: { gte: weekStart, lt: weekEnd },
        assigneeId: { in: memberships.map((m) => m.userId) },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        project: { select: { name: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: {
        organizationId: ctx.organizationId,
        date: { gte: weekStart, lt: weekEnd },
        ...userFilter,
      },
      select: { userId: true, minutes: true, date: true },
    }),
  ]);

  return memberships.map((m) => {
    const userTasks = tasks.filter((t) => t.assigneeId === m.userId);
    const byDay: Record<string, { tasks: typeof userTasks; minutes: number }> = {};
    for (let i = 0; i < 7; i++) {
      const key = dayKey(addDays(weekStart, i));
      byDay[key] = {
        tasks: userTasks.filter((t) => dayKey(t.dueDate!) === key),
        minutes: 0,
      };
    }
    for (const e of entries) {
      if (e.userId !== m.userId) continue;
      const key = dayKey(e.date);
      if (byDay[key]) byDay[key].minutes += e.minutes;
    }
    return {
      user: { id: m.user.id, name: m.user.name ?? m.user.email },
      byDay,
    };
  });
}

/**
 * Сводка отработанного времени за период: день → пользователь → проект → минуты.
 */
export async function getTimeSummary(ctx: SessionContext, weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);
  const userFilter = ctx.role === "EMPLOYEE" ? { userId: ctx.userId } : {};

  const entries = await prisma.timeEntry.findMany({
    where: {
      organizationId: ctx.organizationId,
      date: { gte: weekStart, lt: weekEnd },
      isRunning: false,
      ...userFilter,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    minutes: e.minutes,
    isManual: e.isManual,
    description: e.description,
    userId: e.user.id,
    userName: e.user.name ?? e.user.email,
    taskTitle: e.task.title,
    projectName: e.task.project.name,
  }));
}
