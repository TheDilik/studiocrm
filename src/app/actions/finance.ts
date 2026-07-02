"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { expenseSchema, paymentSchema } from "@/lib/validators/finance";
import * as finance from "@/lib/services/finance";
import { runAction, type ActionResult } from "./helpers";

export async function createPaymentAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await finance.createPayment(ctx, paymentSchema.parse(input));
    revalidatePath("/finance");
  });
}

export async function updatePaymentAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await finance.updatePayment(ctx, id, paymentSchema.parse(input));
    revalidatePath("/finance");
  });
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await finance.deletePayment(ctx, id);
    revalidatePath("/finance");
  });
}

export async function createExpenseAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await finance.createExpense(ctx, expenseSchema.parse(input));
    revalidatePath("/finance");
  });
}

export async function updateExpenseAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await finance.updateExpense(ctx, id, expenseSchema.parse(input));
    revalidatePath("/finance");
  });
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await finance.deleteExpense(ctx, id);
    revalidatePath("/finance");
  });
}
