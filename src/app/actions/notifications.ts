"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import * as notifications from "@/lib/services/notifications";
import { runAction, type ActionResult } from "./helpers";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await notifications.markAsRead(ctx, id);
    revalidatePath("/", "layout");
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await notifications.markAllAsRead(ctx);
    revalidatePath("/", "layout");
  });
}
