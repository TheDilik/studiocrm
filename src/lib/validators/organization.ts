import { z } from "zod";

export const CURRENCIES = ["RUB", "USD", "UZS", "KZT"] as const;

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(1, "Укажите название организации").max(200),
  currency: z.enum(CURRENCIES),
  timezone: z.string().trim().min(1).max(100),
  dateFormat: z.string().trim().min(1).max(30),
});
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;
