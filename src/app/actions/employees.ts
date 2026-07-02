"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { absenceSchema, employeeSchema } from "@/lib/validators/employee";
import * as employees from "@/lib/services/employees";
import { runAction, type ActionResult } from "./helpers";

export async function createEmployeeAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await employees.createEmployee(ctx, employeeSchema.parse(input));
    revalidatePath("/employees");
  });
}

export async function updateEmployeeAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await employees.updateEmployee(ctx, id, employeeSchema.parse(input));
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
  });
}

export async function deleteEmployeeAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await employees.deleteEmployee(ctx, id);
    revalidatePath("/employees");
  });
}

export async function addAbsenceAction(
  employeeId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await employees.addAbsence(ctx, employeeId, absenceSchema.parse(input));
    revalidatePath(`/employees/${employeeId}`);
  });
}

export async function deleteAbsenceAction(
  employeeId: string,
  id: string
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await employees.deleteAbsence(ctx, id);
    revalidatePath(`/employees/${employeeId}`);
  });
}
