"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { teamMemberSchema } from "@/lib/validators/team";
import { createTeamMember, removeTeamMember } from "@/lib/services/team";
import { runAction, type ActionResult } from "./helpers";

export async function createTeamMemberAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await createTeamMember(ctx, teamMemberSchema.parse(input));
    revalidatePath("/settings");
  });
}

export async function removeTeamMemberAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await removeTeamMember(ctx, userId);
    revalidatePath("/settings");
  });
}
