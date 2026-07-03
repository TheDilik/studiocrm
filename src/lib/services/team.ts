// Управление командой (Владелец/Менеджер/Сотрудник). Отдельно от клиентского
// портала — там роль CLIENT и своя логика в services/clients.ts.
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { canManageSettings, ForbiddenError, type SessionContext } from "@/lib/rbac";
import type { TeamMemberInput } from "@/lib/validators/team";

export async function listTeamMembers(ctx: SessionContext) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: ctx.organizationId, role: { not: "CLIENT" } },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { user: { createdAt: "asc" } },
  });
  return memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    role: m.role,
    createdAt: m.user.createdAt,
  }));
}

export async function createTeamMember(ctx: SessionContext, input: TeamMemberInput) {
  if (!canManageSettings(ctx.role)) throw new ForbiddenError();

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) throw new Error("Этот email уже используется другой учётной записью");

  const passwordHash = await hash(input.password, 10);
  await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      memberships: { create: { organizationId: ctx.organizationId, role: input.role } },
    },
  });
}

/**
 * Убирает участника из организации (снимает Membership), сама учётная запись
 * не удаляется — иначе каскадом стёрлась бы вся история задач/времени.
 */
export async function removeTeamMember(ctx: SessionContext, userId: string) {
  if (!canManageSettings(ctx.role)) throw new ForbiddenError();
  if (userId === ctx.userId) throw new Error("Нельзя убрать самого себя из команды");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: ctx.organizationId } },
  });
  if (!membership) throw new Error("Участник не найден");

  if (membership.role === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { organizationId: ctx.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) throw new Error("Нельзя убрать единственного владельца");
  }

  await prisma.membership.delete({
    where: { userId_organizationId: { userId, organizationId: ctx.organizationId } },
  });
}
