// Webhook для Telegram-бота. Обрабатывает только /start <код> — привязку
// чата к пользователю StudioCRM. Инструкция по настройке — в README.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { verifyLinkCode } from "@/lib/telegram/link-code";

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expectedSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const text: string | undefined = message?.text;
  const chatId: number | undefined = message?.chat?.id;
  if (!text || !chatId) return NextResponse.json({ ok: true });

  const match = text.match(/^\/start\s+(\S+)/);
  if (!match) {
    if (text.startsWith("/start")) {
      await sendTelegramMessage(
        String(chatId),
        "Чтобы получать уведомления StudioCRM, откройте код привязки в настройках профиля и перейдите по ссылке ещё раз."
      );
    }
    return NextResponse.json({ ok: true });
  }

  const userId = verifyLinkCode(match[1]);
  if (!userId) {
    await sendTelegramMessage(
      String(chatId),
      "Код недействителен или устарел. Получите новый в настройках StudioCRM."
    );
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: String(chatId) },
  });
  await sendTelegramMessage(
    String(chatId),
    "Готово! Уведомления StudioCRM теперь будут приходить сюда."
  );
  return NextResponse.json({ ok: true });
}
