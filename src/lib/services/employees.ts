// Сервисный слой сотрудников: профили, загрузка, отчёты, отсутствия.
// Раздел доступен OWNER и MANAGER; ставки редактирует только OWNER.
import { prisma } from "@/lib/prisma";
import {
  canManageClients,
  canManageSettings,
  ForbiddenError,
  type SessionContext,
} from "@/lib/rbac";
import type { AbsenceInput, EmployeeInput } from "@/lib/validators/employee";
import { toMinor } from "@/lib/format";
import { addDays, startOfWeek } from "@/lib/services/time";

const emptyToNull = (v: string | undefined) => (v ? v : null);

/** Список с загрузкой: открытые задачи и часы за текущую неделю. */
export async function listEmployees(ctx: SessionContext) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const employees = await prisma.employee.findMany({
    where: { organizationId: ctx.organizationId },
    include: { user: { select: { id: true } } },
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
  });

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  const userIds = employees.map((e) => e.userId).filter(Boolean) as string[];

  const [openTasks, weekEntries, absences] = await Promise.all([
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        organizationId: ctx.organizationId,
        assigneeId: { in: userIds },
        status: { not: "DONE" },
      },
      _count: { id: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: {
        organizationId: ctx.organizationId,
        userId: { in: userIds },
        date: { gte: weekStart, lt: weekEnd },
        isRunning: false,
      },
      _sum: { minutes: true },
    }),
    prisma.absence.findMany({
      where: {
        organizationId: ctx.organizationId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      select: { employeeId: true, type: true },
    }),
  ]);

  const tasksByUser = new Map(openTasks.map((t) => [t.assigneeId, t._count.id]));
  const minutesByUser = new Map(
    weekEntries.map((e) => [e.userId, e._sum.minutes ?? 0])
  );
  const absentNow = new Map(absences.map((a) => [a.employeeId, a.type]));

  return employees.map((e) => ({
    ...e,
    openTasks: e.userId ? (tasksByUser.get(e.userId) ?? 0) : 0,
    weekMinutes: e.userId ? (minutesByUser.get(e.userId) ?? 0) : 0,
    absentType: absentNow.get(e.id) ?? null,
  }));
}

/** Профиль + отчёт за период: часы и задачи по проектам, отсутствия. */
export async function getEmployee(
  ctx: SessionContext,
  id: string,
  periodStart: Date,
  periodEnd: Date
) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      user: { select: { id: true, email: true } },
      absences: { orderBy: { startDate: "desc" } },
    },
  });
  if (!employee) return null;

  let report: {
    totalMinutes: number;
    byProject: { projectId: string; projectName: string; minutes: number; taskCount: number }[];
    doneTasks: number;
    entries: {
      id: string;
      date: Date;
      minutes: number;
      taskTitle: string;
      projectName: string;
      isManual: boolean;
    }[];
  } = { totalMinutes: 0, byProject: [], doneTasks: 0, entries: [] };

  if (employee.userId) {
    const [entries, doneTasks] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          organizationId: ctx.organizationId,
          userId: employee.userId,
          date: { gte: periodStart, lt: periodEnd },
          isRunning: false,
        },
        include: {
          task: {
            select: {
              title: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.task.count({
        where: {
          organizationId: ctx.organizationId,
          assigneeId: employee.userId,
          status: "DONE",
          updatedAt: { gte: periodStart, lt: periodEnd },
        },
      }),
    ]);

    const byProject = new Map<
      string,
      { projectId: string; projectName: string; minutes: number; tasks: Set<string> }
    >();
    let total = 0;
    for (const e of entries) {
      total += e.minutes;
      const key = e.task.project.id;
      const row = byProject.get(key) ?? {
        projectId: key,
        projectName: e.task.project.name,
        minutes: 0,
        tasks: new Set<string>(),
      };
      row.minutes += e.minutes;
      row.tasks.add(e.taskId);
      byProject.set(key, row);
    }

    report = {
      totalMinutes: total,
      byProject: [...byProject.values()]
        .map((r) => ({
          projectId: r.projectId,
          projectName: r.projectName,
          minutes: r.minutes,
          taskCount: r.tasks.size,
        }))
        .sort((a, b) => b.minutes - a.minutes),
      doneTasks,
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date,
        minutes: e.minutes,
        taskTitle: e.task.title,
        projectName: e.task.project.name,
        isManual: e.isManual,
      })),
    };
  }

  return { ...employee, report };
}

export async function createEmployee(ctx: SessionContext, input: EmployeeInput) {
  if (!canManageSettings(ctx.role)) throw new ForbiddenError(); // только владелец

  return prisma.employee.create({
    data: {
      organizationId: ctx.organizationId,
      fullName: input.fullName,
      position: emptyToNull(input.position),
      rateType: input.rateType,
      rateAmount: toMinor(input.rateMajor),
      hireDate: input.hireDate ?? null,
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      userId: emptyToNull(input.userId),
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateEmployee(
  ctx: SessionContext,
  id: string,
  input: EmployeeInput
) {
  if (!canManageSettings(ctx.role)) throw new ForbiddenError();

  const { count } = await prisma.employee.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      fullName: input.fullName,
      position: emptyToNull(input.position),
      rateType: input.rateType,
      rateAmount: toMinor(input.rateMajor),
      hireDate: input.hireDate ?? null,
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      userId: emptyToNull(input.userId),
      isActive: input.isActive ?? true,
    },
  });
  if (count === 0) throw new Error("Сотрудник не найден");
}

export async function deleteEmployee(ctx: SessionContext, id: string) {
  if (!canManageSettings(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.employee.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Сотрудник не найден");
}

// --- Отсутствия ---

export async function addAbsence(
  ctx: SessionContext,
  employeeId: string,
  input: AbsenceInput
) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!employee) throw new Error("Сотрудник не найден");

  return prisma.absence.create({
    data: {
      organizationId: ctx.organizationId,
      employeeId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      note: emptyToNull(input.note),
    },
  });
}

export async function deleteAbsence(ctx: SessionContext, id: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.absence.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Запись не найдена");
}

/** Пользователи без привязки к сотруднику (для селекта в форме). */
export async function listUnlinkedUsers(ctx: SessionContext, exceptEmployeeId?: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: ctx.organizationId, role: { not: "CLIENT" } },
    include: {
      user: {
        select: { id: true, name: true, email: true, employee: { select: { id: true } } },
      },
    },
  });
  return memberships
    .filter(
      (m) =>
        !m.user.employee ||
        (exceptEmployeeId && m.user.employee.id === exceptEmployeeId)
    )
    .map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email }));
}
