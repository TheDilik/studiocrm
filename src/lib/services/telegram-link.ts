import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/lib/rbac";
import { createLinkCode } from "@/lib/telegram/link-code";
import { isTelegramConfigured } from "@/lib/telegram/client";

export async function getTelegramStatus(ctx: SessionContext) {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { telegramChatId: true },
  });
  return {
    configured: isTelegramConfigured(),
    connected: !!user?.telegramChatId,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
  };
}

export function generateTelegramLinkCode(ctx: SessionContext) {
  if (!isTelegramConfigured()) {
    throw new Error("Telegram-бот не настроен администратором сервера");
  }
  return createLinkCode(ctx.userId);
}

export async function disconnectTelegram(ctx: SessionContext) {
  await prisma.user.update({
    where: { id: ctx.userId },
    data: { telegramChatId: null },
  });
}
