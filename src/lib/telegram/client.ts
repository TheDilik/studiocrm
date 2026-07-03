// Заготовка интеграции с Telegram-ботом. Пока TELEGRAM_BOT_TOKEN не задан,
// отправка тихо ничего не делает — остальной код не нужно менять, когда
// бот будет подключён. Инструкция по подключению — в README.
import "server-only";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export function isTelegramConfigured(): boolean {
  return !!BOT_TOKEN;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Сбой Telegram не должен ронять основной поток (создание задачи, платежа и т.д.)
  }
}
