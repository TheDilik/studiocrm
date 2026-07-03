"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import {
  disconnectTelegram,
  generateTelegramLinkCode,
} from "@/lib/services/telegram-link";
import { runAction, type ActionResult } from "./helpers";

type LinkCodeResult = { ok: true; code: string } | { ok: false; error: string };

export async function generateTelegramLinkCodeAction(): Promise<LinkCodeResult> {
  try {
    const ctx = await requireSession();
    const code = generateTelegramLinkCode(ctx);
    return { ok: true, code };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function disconnectTelegramAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await disconnectTelegram(ctx);
    revalidatePath("/settings");
  });
}
