import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

/**
 * Контекст текущего пользователя для сервисного слоя.
 * Все сервисы обязаны принимать его и фильтровать по organizationId.
 */
export type SessionContext = {
  userId: string;
  organizationId: string;
  role: Role;
};

export class AuthError extends Error {
  constructor(message = "Не авторизован") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Недостаточно прав") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Возвращает контекст сессии или бросает AuthError. */
export async function requireSession(): Promise<SessionContext> {
  const session = await auth();
  if (!session?.user) throw new AuthError();
  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role,
  };
}

/** Проверяет, что роль пользователя входит в список разрешённых. */
export async function requireRole(...roles: Role[]): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!roles.includes(ctx.role)) throw new ForbiddenError();
  return ctx;
}

// --- Матрица прав по модулям ---

/** Финансы: полный доступ — владелец; просмотр — менеджер. */
export function canViewFinance(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}
export function canEditFinance(role: Role) {
  return role === "OWNER";
}

/** Клиенты и проекты: владелец и менеджер управляют, сотрудник видит свои. */
export function canManageClients(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

/** Настройки организации — только владелец. */
export function canManageSettings(role: Role) {
  return role === "OWNER";
}
