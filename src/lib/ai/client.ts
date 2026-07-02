import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Ключ и вызовы Claude — только на сервере, никогда с клиента. */
export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI-помощник не настроен: задайте ANTHROPIC_API_KEY в переменных окружения"
    );
  }
  return new Anthropic({ apiKey });
}

export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5";
