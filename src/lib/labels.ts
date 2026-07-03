// Русские подписи и цвета статусов — единый источник для всего UI.
import type {
  ClientStatus,
  ProjectStatus,
  ProjectType,
  MilestoneStatus,
  TaskStatus,
  TaskPriority,
  PaymentStatus,
  PaymentKind,
  ExpenseCategory,
  InteractionType,
} from "@prisma/client";

type LabelMap<T extends string> = Record<T, { label: string; className: string }>;

export const ROLE_LABELS: Record<import("@prisma/client").Role, string> = {
  OWNER: "Владелец",
  MANAGER: "Менеджер",
  EMPLOYEE: "Сотрудник",
  CLIENT: "Клиент",
};

export const CLIENT_STATUS: LabelMap<ClientStatus> = {
  LEAD: { label: "Лид", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  NEGOTIATION: { label: "В переговорах", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  ACTIVE: { label: "Активный", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  ARCHIVED: { label: "Архив", className: "bg-muted text-muted-foreground" },
};

export const PROJECT_STATUS: LabelMap<ProjectStatus> = {
  NEGOTIATION: { label: "Переговоры", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  IN_PROGRESS: { label: "В работе", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  ON_HOLD: { label: "На паузе", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  DELIVERED: { label: "Сдан", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  CANCELLED: { label: "Отменён", className: "bg-muted text-muted-foreground" },
};

export const PROJECT_TYPE: Record<ProjectType, string> = {
  WEBSITE: "Сайт",
  ECOMMERCE: "Интернет-магазин",
  LANDING: "Лендинг",
  SUPPORT: "Поддержка",
  OTHER: "Другое",
};

export const MILESTONE_STATUS: LabelMap<MilestoneStatus> = {
  PENDING: { label: "Ожидает", className: "bg-muted text-muted-foreground" },
  IN_PROGRESS: { label: "В работе", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  DONE: { label: "Готов", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  APPROVED: { label: "Согласован", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

export const TASK_STATUS: LabelMap<TaskStatus> = {
  BACKLOG: { label: "Бэклог", className: "bg-muted text-muted-foreground" },
  IN_PROGRESS: { label: "В работе", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  REVIEW: { label: "На проверке", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  DONE: { label: "Готово", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

export const TASK_PRIORITY: LabelMap<TaskPriority> = {
  LOW: { label: "Низкий", className: "bg-muted text-muted-foreground" },
  MEDIUM: { label: "Средний", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  HIGH: { label: "Высокий", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  URGENT: { label: "Срочный", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

export const PAYMENT_STATUS: LabelMap<PaymentStatus> = {
  EXPECTED: { label: "Ожидается", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  RECEIVED: { label: "Получен", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  OVERDUE: { label: "Просрочен", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

export const PAYMENT_KIND: Record<PaymentKind, string> = {
  PREPAYMENT: "Предоплата",
  POSTPAYMENT: "Постоплата",
  INSTALLMENT: "Этап",
  FULL: "Полная",
};

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  SALARY: "Зарплаты",
  CONTRACTOR: "Подрядчики",
  SOFTWARE: "Софт/подписки",
  ADVERTISING: "Реклама",
  OFFICE: "Офис",
  OTHER: "Прочее",
};

export const NOTIFICATION_ICON: Record<
  import("@prisma/client").NotificationType,
  string
> = {
  TASK_ASSIGNED: "📋",
  DEADLINE_SOON: "⏰",
  PAYMENT_RECEIVED: "💰",
  PAYMENT_OVERDUE: "⚠️",
  MENTION: "💬",
  OTHER: "🔔",
};

export const ABSENCE_TYPE: Record<import("@prisma/client").AbsenceType, string> = {
  VACATION: "Отпуск",
  DAY_OFF: "Отгул",
  SICK: "Больничный",
  OTHER: "Другое",
};

export const RATE_TYPE: Record<import("@prisma/client").RateType, string> = {
  HOURLY: "₽/час",
  MONTHLY: "₽/мес",
};

export const INTERACTION_TYPE: Record<InteractionType, string> = {
  CALL: "Звонок",
  MEETING: "Встреча",
  EMAIL: "Письмо",
  MESSAGE: "Сообщение",
  OTHER: "Другое",
};
