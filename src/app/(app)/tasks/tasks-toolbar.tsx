"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

const ALL = "__all__";

const VIEWS = [
  { key: "kanban", label: "Канбан", icon: Columns3 },
  { key: "calendar", label: "Календарь", icon: CalendarDays },
  { key: "time", label: "Время", icon: Clock },
] as const;

export function TasksToolbar({
  view,
  weekStart,
  projects,
  users,
  showFilters,
}: {
  view: string;
  weekStart: Date;
  projects: { id: string; name: string }[];
  users: { id: string; name: string }[];
  showFilters: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const makeHref = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    return `/tasks?${next.toString()}`;
  };

  const setParam = (key: string, value: string) => {
    startTransition(() =>
      router.replace(makeHref({ [key]: value === ALL ? null : value }))
    );
  };

  const week = Number(searchParams.get("week") ?? "0");
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Переключение видов */}
      <div className="flex rounded-lg border p-0.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={makeHref({ view: v.key === "kanban" ? null : v.key })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === v.key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <v.icon className="size-4" />
            <span className="hidden sm:inline">{v.label}</span>
          </Link>
        ))}
      </div>

      {/* Навигация по неделям */}
      {view !== "kanban" && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" asChild>
            <Link href={makeHref({ week: String(week - 1) })} aria-label="Предыдущая неделя">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-40 px-1 text-center text-sm text-muted-foreground">
            {formatDate(weekStart)} — {formatDate(weekEnd)}
          </span>
          <Button variant="outline" size="icon" className="size-8" asChild>
            <Link href={makeHref({ week: String(week + 1) })} aria-label="Следующая неделя">
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          {week !== 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={makeHref({ week: null })}>Сегодня</Link>
            </Button>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Фильтры канбана */}
      {view === "kanban" && (
        <>
          <Select
            defaultValue={searchParams.get("projectId") ?? ALL}
            onValueChange={(v) => setParam("projectId", v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Проект" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все проекты</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showFilters && (
            <Select
              defaultValue={searchParams.get("assigneeId") ?? ALL}
              onValueChange={(v) => setParam("assigneeId", v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Исполнитель" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все исполнители</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      )}
    </div>
  );
}
