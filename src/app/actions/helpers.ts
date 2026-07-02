import { ZodError } from "zod";
import { AuthError, ForbiddenError } from "@/lib/rbac";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Единая обработка ошибок server actions: Zod, права, бизнес-ошибки. */
export async function runAction(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Некорректные данные" };
    }
    if (error instanceof ForbiddenError || error instanceof AuthError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Что-то пошло не так" };
  }
}
