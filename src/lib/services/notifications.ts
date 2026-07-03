// Уведомления пользователя. Создание уведомлений живёт в сервисах-источниках
// (tasks.ts, finance.ts) через createNotification — здесь чтение/пометка
// своих уведомлений и фоновые проверки.
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/lib/rbac";
import { addDays } from "@/lib/services/time";
import { sendTelegramMessage } from "@/lib/telegram/client";

export type NewNotification = {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
};

/**
 * Единая точка создания уведомления: пишет в БД и, если у пользователя
 * привязан Telegram (см. lib/telegram), дублирует туда же. Пока бот не
 * настроен (TELEGRAM_BOT_TOKEN пуст), отправка — no-op.
 */
export async function createNotification(input: NewNotification) {
  const [notification, user] = await Promise.all([
    prisma.notification.create({ data: input }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { telegramChatId: true },
    }),
  ]);
  if (user?.telegramChatId) {
    const text = input.body ? `<b>${input.title}</b>\n${input.body}` : `<b>${input.title}</b>`;
    void sendTelegramMessage(user.telegramChatId, text);
  }
  return notification;
}

export async function listNotifications(ctx: SessionContext, take = 20) {
  return prisma.notification.findMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function countUnread(ctx: SessionContext) {
  return prisma.notification.count({
    where: { organizationId: ctx.organizationId, userId: ctx.userId, isRead: false },
  });
}

export async function markAsRead(ctx: SessionContext, id: string) {
  await prisma.notification.updateMany({
    where: { id, organizationId: ctx.organizationId, userId: ctx.userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(ctx: SessionContext) {
  await prisma.notification.updateMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Фоновая проверка приближающихся дедлайнов (в пределах суток), как и
 * checkOverduePayments — вызывается при заходе на страницы с колокольчиком,
 * до подключения полноценного крона. Не дублирует уведомление, если за
 * последние 24 часа по этой задаче уже что-то отправляли.
 */
export async function checkUpcomingDeadlines(organizationId: string) {
  const now = new Date();
  const soon = addDays(now, 1);

  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      status: { not: "DONE" },
      dueDate: { gte: now, lte: soon },
      assigneeId: { not: null },
    },
    select: { id: true, title: true, dueDate: true, assigneeId: true },
  });
  if (tasks.length === 0) return 0;

  const dayAgo = addDays(now, -1);
  const recent = await prisma.notification.findMany({
    where: {
      organizationId,
      type: "DEADLINE_SOON",
      entityType: "task",
      entityId: { in: tasks.map((t) => t.id) },
      createdAt: { gte: dayAgo },
    },
    select: { entityId: true },
  });
  const alreadyNotified = new Set(recent.map((r) => r.entityId));
  const toNotify = tasks.filter((t) => !alreadyNotified.has(t.id));
  if (toNotify.length === 0) return 0;

  await Promise.all(
    toNotify.map((t) =>
      createNotification({
        organizationId,
        userId: t.assigneeId!,
        type: "DEADLINE_SOON",
        title: "Приближается дедлайн",
        body: `«${t.title}» — срок ${t.dueDate!.toLocaleDateString("ru-RU")}`,
        entityType: "task",
        entityId: t.id,
      })
    )
  );
  return toNotify.length;
}
