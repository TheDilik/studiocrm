import { z } from "zod";

export const paymentSchema = z.object({
  clientId: z.string().min(1, "Выберите клиента"),
  projectId: z.string().optional().or(z.literal("")),
  // Сумма в рублях, в сервисе — в копейки
  amountMajor: z.coerce.number().positive("Сумма должна быть больше нуля"),
  method: z.string().trim().max(100).optional().or(z.literal("")),
  kind: z.enum(["PREPAYMENT", "POSTPAYMENT", "INSTALLMENT", "FULL"]),
  status: z.enum(["EXPECTED", "RECEIVED", "OVERDUE"]),
  dueDate: z.coerce.date().optional().nullable(),
  paidAt: z.coerce.date().optional().nullable(),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const expenseSchema = z.object({
  category: z.enum(["SALARY", "CONTRACTOR", "SOFTWARE", "ADVERTISING", "OFFICE", "OTHER"]),
  amountMajor: z.coerce.number().positive("Сумма должна быть больше нуля"),
  date: z.coerce.date(),
  projectId: z.string().optional().or(z.literal("")),
  // Имя подрядчика/фрилансера — заполняется для category = CONTRACTOR
  contractorName: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
