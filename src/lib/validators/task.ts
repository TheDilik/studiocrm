import { z } from "zod";

export const taskSchema = z.object({
  projectId: z.string().min(1, "Выберите проект"),
  title: z.string().trim().min(1, "Укажите название задачи").max(300),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]),
  dueDate: z.coerce.date().optional().nullable(),
});
export type TaskInput = z.infer<typeof taskSchema>;

/** Перенос по канбану: новый статус + порядок id в целевой колонке. */
export const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]),
  orderedIds: z.array(z.string()).max(500),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const taskFiltersSchema = z.object({
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  q: z.string().optional(),
});
export type TaskFilters = z.infer<typeof taskFiltersSchema>;

/** Ручное внесение времени задним числом. */
export const manualTimeSchema = z.object({
  taskId: z.string().min(1, "Выберите задачу"),
  date: z.coerce.date(),
  hours: z.coerce.number().min(0).max(24),
  minutes: z.coerce.number().min(0).max(59),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ManualTimeInput = z.infer<typeof manualTimeSchema>;
