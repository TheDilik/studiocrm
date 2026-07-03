import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().trim().min(1, "Укажите название компании").max(200),
  industry: z.string().trim().max(200).optional().or(z.literal("")),
  source: z.string().trim().max(200).optional().or(z.literal("")),
  status: z.enum(["LEAD", "NEGOTIATION", "ACTIVE", "ARCHIVED"]),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  // Основной контакт — необязательно, заполняется только при создании клиента
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(50).optional().or(z.literal("")),
  contactEmail: z.string().trim().email("Некорректный email").optional().or(z.literal("")),
  contactTelegram: z.string().trim().max(100).optional().or(z.literal("")),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(200),
  position: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email("Некорректный email").optional().or(z.literal("")),
  telegram: z.string().trim().max(100).optional().or(z.literal("")),
  isPrimary: z.boolean().optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const interactionSchema = z.object({
  type: z.enum(["CALL", "MEETING", "EMAIL", "MESSAGE", "OTHER"]),
  note: z.string().trim().min(1, "Опишите взаимодействие").max(5000),
  date: z.coerce.date(),
});
export type InteractionInput = z.infer<typeof interactionSchema>;

export const clientFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["LEAD", "NEGOTIATION", "ACTIVE", "ARCHIVED"]).optional(),
  source: z.string().optional(),
  managerId: z.string().optional(),
});
export type ClientFilters = z.infer<typeof clientFiltersSchema>;
