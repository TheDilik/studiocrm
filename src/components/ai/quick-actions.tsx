"use client";

import { FileText, Mail, ListTodo, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuickAction = { label: string; icon: typeof FileText; prompt: string; autoSend?: boolean };

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Отчёт недели",
    icon: TrendingUp,
    prompt: "Сгенерируй отчёт по итогам этой недели: задачи, часы, финансы, что требует внимания.",
    autoSend: true,
  },
  {
    label: "КП по проекту",
    icon: FileText,
    prompt: "Составь коммерческое предложение по проекту «впишите название проекта»",
  },
  {
    label: "Письмо клиенту",
    icon: Mail,
    prompt: "Напиши письмо клиенту «впишите название клиента» о том, что ",
  },
  {
    label: "Описание задачи",
    icon: ListTodo,
    prompt: "Напиши описание задачи для проекта «впишите название проекта»: ",
  },
];

export function QuickActions({
  onPick,
}: {
  onPick: (action: QuickAction) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onPick(action)}
        >
          <action.icon className="size-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
