"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { portalAccessSchema, milestoneCommentSchema } from "@/lib/validators/portal";
import { createPortalAccess, revokePortalAccess } from "@/lib/services/clients";
import {
  addMilestoneComment,
  approveMilestone,
} from "@/lib/services/projects";
import { runAction, type ActionResult } from "./helpers";

export async function createPortalAccessAction(
  clientId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await createPortalAccess(ctx, clientId, portalAccessSchema.parse(input));
    revalidatePath(`/clients/${clientId}`);
  });
}

export async function revokePortalAccessAction(clientId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await revokePortalAccess(ctx, clientId);
    revalidatePath(`/clients/${clientId}`);
  });
}

export async function addMilestoneCommentAction(
  milestoneId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    const { body } = milestoneCommentSchema.parse(input);
    await addMilestoneComment(ctx, milestoneId, body);
    revalidatePath("/portal");
    revalidatePath("/projects");
  });
}

export async function approveMilestoneAction(milestoneId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await approveMilestone(ctx, milestoneId);
    revalidatePath("/portal");
  });
}
