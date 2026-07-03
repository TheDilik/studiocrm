// Клиентский портал: клиент видит только свои проекты и этапы.
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionContext } from "@/lib/rbac";

export async function getPortalClient(ctx: SessionContext) {
  if (ctx.role !== "CLIENT") throw new ForbiddenError();

  const client = await prisma.client.findFirst({
    where: { organizationId: ctx.organizationId, portalUserId: ctx.userId },
  });
  if (!client) throw new Error("Клиентский профиль не найден");
  return client;
}

export async function listPortalProjects(ctx: SessionContext) {
  const client = await getPortalClient(ctx);
  return prisma.project.findMany({
    where: { clientId: client.id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      manager: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPortalProject(ctx: SessionContext, projectId: string) {
  const client = await getPortalClient(ctx);

  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId: client.id },
    include: {
      manager: { select: { name: true } },
      milestones: {
        orderBy: { order: "asc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });
  return project;
}
