import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/lib/rbac";

/** У каждого пользователя — одна текущая беседа с ассистентом (можно сбросить). */
export async function getOrCreateConversation(ctx: SessionContext) {
  const existing = await prisma.aiConversation.findFirst({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;

  return prisma.aiConversation.create({
    data: { organizationId: ctx.organizationId, userId: ctx.userId },
  });
}

export async function listMessages(conversationId: string) {
  return prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function addMessage(
  conversationId: string,
  role: "USER" | "ASSISTANT",
  content: string,
  toolCalls?: unknown
) {
  await prisma.$transaction([
    prisma.aiMessage.create({
      data: { conversationId, role, content, toolCalls: toolCalls as never },
    }),
    prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export async function resetConversation(ctx: SessionContext) {
  await prisma.aiConversation.deleteMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
  });
}
