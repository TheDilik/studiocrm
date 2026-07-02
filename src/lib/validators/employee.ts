import { z } from "zod";

export const employeeSchema = z.object({
  fullName: z.string().trim().min(1, "Укажите ФИО").max(200),
  position: z.string().trim().max(200).optional().or(z.literal("")),
  rateType: z.enum(["HOURLY", "MONTHLY"]),
  // Ставка в рублях, конвертируется в копейки в сервисе
  rateMajor: z.coerce.number().min(0, "Ставка не может быть отрицательной"),
  hireDate: z.coerce.date().optional().nullable(),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email("Некорректный email").optional().or(z.literal("")),
  userId: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const absenceSchema = z
  .object({
    type: z.enum(["VACATION", "DAY_OFF", "SICK", "OTHER"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "Дата окончания раньше даты начала",
    path: ["endDate"],
  });
export type AbsenceInput = z.infer<typeof absenceSchema>;
