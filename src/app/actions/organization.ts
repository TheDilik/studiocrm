"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { organizationSettingsSchema } from "@/lib/validators/organization";
import { updateOrganizationSettings } from "@/lib/services/organization";
import { runAction, type ActionResult } from "./helpers";

export async function updateOrganizationSettingsAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await updateOrganizationSettings(ctx, organizationSettingsSchema.parse(input));
    revalidatePath("/settings");
  });
}
