"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { milestoneSchema, projectSchema } from "@/lib/validators/project";
import * as projects from "@/lib/services/projects";
import { runAction, type ActionResult } from "./helpers";

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await projects.createProject(ctx, projectSchema.parse(input));
    revalidatePath("/projects");
  });
}

export async function updateProjectAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await projects.updateProject(ctx, id, projectSchema.parse(input));
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
  });
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await projects.deleteProject(ctx, id);
    revalidatePath("/projects");
  });
}

export async function addMilestoneAction(
  projectId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await projects.addMilestone(ctx, projectId, milestoneSchema.parse(input));
    revalidatePath(`/projects/${projectId}`);
  });
}

export async function updateMilestoneAction(
  projectId: string,
  milestoneId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await projects.updateMilestone(ctx, milestoneId, milestoneSchema.parse(input));
    revalidatePath(`/projects/${projectId}`);
  });
}

export async function deleteMilestoneAction(
  projectId: string,
  milestoneId: string
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await projects.deleteMilestone(ctx, milestoneId);
    revalidatePath(`/projects/${projectId}`);
  });
}
