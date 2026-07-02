"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import {
  manualTimeSchema,
  moveTaskSchema,
  taskSchema,
} from "@/lib/validators/task";
import * as tasks from "@/lib/services/tasks";
import * as time from "@/lib/services/time";
import { runAction, type ActionResult } from "./helpers";

export async function createTaskAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await tasks.createTask(ctx, taskSchema.parse(input));
    revalidatePath("/tasks");
  });
}

export async function updateTaskAction(
  taskId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await tasks.updateTask(ctx, taskId, taskSchema.parse(input));
    revalidatePath("/tasks");
  });
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await tasks.deleteTask(ctx, taskId);
    revalidatePath("/tasks");
  });
}

export async function moveTaskAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await tasks.moveTask(ctx, moveTaskSchema.parse(input));
    revalidatePath("/tasks");
  });
}

// --- Время ---

export async function startTimerAction(taskId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await time.startTimer(ctx, taskId);
    revalidatePath("/tasks");
  });
}

export async function stopTimerAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await time.stopTimer(ctx);
    revalidatePath("/tasks");
  });
}

export async function addManualTimeAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await time.addManualTime(ctx, manualTimeSchema.parse(input));
    revalidatePath("/tasks");
  });
}

export async function deleteTimeEntryAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await time.deleteTimeEntry(ctx, id);
    revalidatePath("/tasks");
  });
}
