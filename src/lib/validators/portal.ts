import { z } from "zod";

export const portalAccessSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});
export type PortalAccessInput = z.infer<typeof portalAccessSchema>;

export const milestoneCommentSchema = z.object({
  body: z.string().trim().min(1, "Введите комментарий").max(3000),
});
export type MilestoneCommentInput = z.infer<typeof milestoneCommentSchema>;
