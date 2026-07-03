import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/rbac";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { AI_TOOLS, executeTool } from "@/lib/ai/tools";
import {
  addMessage,
  getOrCreateConversation,
  listMessages,
  resetConversation,
} from "@/lib/services/ai";

const SYSTEM_PROMPT = `Ты — AI-помощник внутри StudioCRM, системы управления веб-студией.
Отвечай на русском языке, кратко и по делу, используй markdown-списки при перечислении.
Для вопросов о данных студии (задачи, проекты, клиенты, финансы, загрузка сотрудников)
всегда используй доступные инструменты — не выдумывай цифры.
Ты также можешь писать тексты: коммерческие предложения по данным проекта, письма клиентам,
описания задач. Перед этим по возможности собери реальные данные через инструменты
(например, бюджет и статус проекта), чтобы текст был точным.
Если инструмент сообщает об отсутствии доступа — вежливо объясни, что эти данные скрыты
для текущей роли, не пытайся обойти ограничение.`;

const MAX_TOOL_ROUNDS = 6;

export async function GET() {
  try {
    const ctx = await requireSession();
    const conversation = await getOrCreateConversation(ctx);
    const messages = await listMessages(conversation.id);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function DELETE() {
  const ctx = await requireSession();
  await resetConversation(ctx);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const ctx = await requireSession();
  const body = await request.json().catch(() => null);
  const userMessage = typeof body?.message === "string" ? body.message.trim() : "";
  if (!userMessage) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI-помощник не настроен" },
      { status: 503 }
    );
  }

  const conversation = await getOrCreateConversation(ctx);
  const history = await listMessages(conversation.id);

  await addMessage(conversation.id, "USER", userMessage);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const toolTrace: { name: string; input: unknown }[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: AI_TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        const finalText = text || "Не удалось сформировать ответ.";
        await addMessage(
          conversation.id,
          "ASSISTANT",
          finalText,
          toolTrace.length ? toolTrace : undefined
        );
        return NextResponse.json({ reply: finalText, toolCalls: toolTrace });
      }

      // Модель запросила инструменты — выполняем и продолжаем диалог
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        toolTrace.push({ name: block.name, input: block.input });
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          ctx
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    const fallback = "Не удалось получить окончательный ответ за отведённое число шагов.";
    await addMessage(conversation.id, "ASSISTANT", fallback, toolTrace);
    return NextResponse.json({ reply: fallback, toolCalls: toolTrace });
  } catch (error) {
    return NextResponse.json({ error: describeAiError(error) }, { status: 502 });
  }
}

/** Переводит типовые ошибки Anthropic API в понятные русские сообщения. */
function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    const detail =
      (error.error as { error?: { message?: string } } | undefined)?.error?.message ??
      "";
    if (error.status === 401) {
      return "Неверный ANTHROPIC_API_KEY — проверьте ключ в настройках.";
    }
    if (error.status === 400 && detail.toLowerCase().includes("credit balance")) {
      return "На аккаунте Anthropic закончились кредиты. Пополните баланс на console.anthropic.com → Plans & Billing.";
    }
    if (error.status === 429) {
      return "Превышен лимит запросов к Claude API. Попробуйте через минуту.";
    }
    return `Ошибка Anthropic API (${error.status}): ${detail || error.message}`;
  }
  return error instanceof Error ? error.message : "Ошибка при обращении к AI";
}
