import { z } from "zod";

export const projectSchema = z.object({
  clientId: z.string().min(1, "Выберите клиента"),
  name: z.string().trim().min(1, "Укажите название проекта").max(300),
  type: z.enum(["WEBSITE", "ECOMMERCE", "LANDING", "SUPPORT", "OTHER"]),
  // Бюджет приходит из формы в рублях, в action конвертируется в копейки
  budgetMajor: z.coerce.number().min(0, "Бюджет не может быть отрицательным"),
  startDate: z.coerce.date().optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
  status: z.enum(["NEGOTIATION", "IN_PROGRESS", "ON_HOLD", "DELIVERED", "CANCELLED"]),
  managerId: z.string().optional().or(z.literal("")),
  memberIds: z.array(z.string()).optional(),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const milestoneSchema = z.object({
  name: z.string().trim().min(1, "Укажите название этапа").max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  dueDate: z.coerce.date().optional().nullable(),
  amountMajor: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "APPROVED"]),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;

export const projectFiltersSchema = z.object({
  q: z.string().optional(),
  status: z
    .enum(["NEGOTIATION", "IN_PROGRESS", "ON_HOLD", "DELIVERED", "CANCELLED"])
    .optional(),
  clientId: z.string().optional(),
});
export type ProjectFilters = z.infer<typeof projectFiltersSchema>;
