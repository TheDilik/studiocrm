import { prisma } from "@/lib/prisma";
import { canManageSettings, ForbiddenError, type SessionContext } from "@/lib/rbac";
import type { OrganizationSettingsInput } from "@/lib/validators/organization";

export async function getOrganization(ctx: SessionContext) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: ctx.organizationId },
  });
  return org;
}

export async function updateOrganizationSettings(
  ctx: SessionContext,
  input: OrganizationSettingsInput
) {
  if (!canManageSettings(ctx.role)) throw new ForbiddenError();
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: input,
  });
}
