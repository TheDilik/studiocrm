// Сервисный слой клиентов. Всегда принимает SessionContext и фильтрует по organizationId.
import { prisma } from "@/lib/prisma";
import { canManageClients, ForbiddenError, type SessionContext } from "@/lib/rbac";
import type {
  ClientFilters,
  ClientInput,
  ContactInput,
  InteractionInput,
} from "@/lib/validators/client";

const emptyToNull = (v: string | undefined) => (v ? v : null);

export async function listClients(ctx: SessionContext, filters: ClientFilters) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  return prisma.client.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.source && { source: filters.source }),
      ...(filters.managerId && { managerId: filters.managerId }),
      ...(filters.q && {
        OR: [
          { companyName: { contains: filters.q, mode: "insensitive" } },
          { contacts: { some: { name: { contains: filters.q, mode: "insensitive" } } } },
        ],
      }),
    },
    include: {
      manager: { select: { id: true, name: true } },
      contacts: { where: { isPrimary: true }, take: 1 },
      _count: { select: { projects: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Список источников для фильтра (уникальные значения по организации). */
export async function listClientSources(ctx: SessionContext) {
  const rows = await prisma.client.findMany({
    where: { organizationId: ctx.organizationId, source: { not: null } },
    select: { source: true },
    distinct: ["source"],
  });
  return rows.map((r) => r.source!).filter(Boolean);
}

export async function getClient(ctx: SessionContext, id: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const client = await prisma.client.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      manager: { select: { id: true, name: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      interactions: {
        orderBy: { date: "desc" },
        include: { author: { select: { name: true } } },
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          deadline: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          status: true,
          kind: true,
          paidAt: true,
          dueDate: true,
          project: { select: { name: true } },
        },
      },
    },
  });
  if (!client) return null;

  // Сводка: сколько проектов, сколько заплатил всего
  const totalPaid = client.payments
    .filter((p) => p.status === "RECEIVED")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = client.payments
    .filter((p) => p.status !== "RECEIVED")
    .reduce((sum, p) => sum + p.amount, 0);

  return { ...client, summary: { projectCount: client.projects.length, totalPaid, totalExpected } };
}

export async function createClient(ctx: SessionContext, input: ClientInput) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  return prisma.client.create({
    data: {
      organizationId: ctx.organizationId,
      companyName: input.companyName,
      industry: emptyToNull(input.industry),
      source: emptyToNull(input.source),
      status: input.status,
      notes: emptyToNull(input.notes),
      managerId: emptyToNull(input.managerId),
    },
  });
}

export async function updateClient(ctx: SessionContext, id: string, input: ClientInput) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  // updateMany с organizationId — защита от чужого тенанта
  const { count } = await prisma.client.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      companyName: input.companyName,
      industry: emptyToNull(input.industry),
      source: emptyToNull(input.source),
      status: input.status,
      notes: emptyToNull(input.notes),
      managerId: emptyToNull(input.managerId),
    },
  });
  if (count === 0) throw new Error("Клиент не найден");
}

export async function deleteClient(ctx: SessionContext, id: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.client.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Клиент не найден");
}

// --- Контактные лица ---

async function assertClientInOrg(ctx: SessionContext, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!client) throw new Error("Клиент не найден");
}

export async function addContact(ctx: SessionContext, clientId: string, input: ContactInput) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  await assertClientInOrg(ctx, clientId);

  return prisma.contactPerson.create({
    data: {
      clientId,
      name: input.name,
      position: emptyToNull(input.position),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      telegram: emptyToNull(input.telegram),
      isPrimary: input.isPrimary ?? false,
    },
  });
}

export async function updateContact(
  ctx: SessionContext,
  contactId: string,
  input: ContactInput
) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();

  const { count } = await prisma.contactPerson.updateMany({
    where: { id: contactId, client: { organizationId: ctx.organizationId } },
    data: {
      name: input.name,
      position: emptyToNull(input.position),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      telegram: emptyToNull(input.telegram),
      isPrimary: input.isPrimary ?? false,
    },
  });
  if (count === 0) throw new Error("Контакт не найден");
}

export async function deleteContact(ctx: SessionContext, contactId: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.contactPerson.deleteMany({
    where: { id: contactId, client: { organizationId: ctx.organizationId } },
  });
  if (count === 0) throw new Error("Контакт не найден");
}

// --- Журнал взаимодействий ---

export async function addInteraction(
  ctx: SessionContext,
  clientId: string,
  input: InteractionInput
) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  await assertClientInOrg(ctx, clientId);

  return prisma.interaction.create({
    data: {
      organizationId: ctx.organizationId,
      clientId,
      authorId: ctx.userId,
      type: input.type,
      note: input.note,
      date: input.date,
    },
  });
}

export async function deleteInteraction(ctx: SessionContext, id: string) {
  if (!canManageClients(ctx.role)) throw new ForbiddenError();
  const { count } = await prisma.interaction.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });
  if (count === 0) throw new Error("Запись не найдена");
}
