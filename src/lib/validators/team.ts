import { z } from "zod";

export const teamMemberSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(200),
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE"]),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
