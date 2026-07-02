// Сводка отработанного времени за неделю: день → сотрудник → проект.
import { Trash2 } from "lucide-react";
import { deleteTimeEntryAction } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { formatDate, formatHours } from "@/lib/format";
import { localDayKey } from "@/lib/services/time";
import type { getTimeSummary } from "@/lib/services/time";

type Entries = Awaited<ReturnType<typeof getTimeSummary>>;

export function TimeSummaryView({ entries }: { entries: Entries }) {
  // Группировка: день → записи
  const byDay = new Map<string, Entries>();
  for (const e of entries) {
    const key = localDayKey(e.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const weekTotal = entries.reduce((s, e) => s + e.minutes, 0);

  // Итого по сотрудникам за неделю
  const byUser = new Map<string, { name: string; minutes: number }>();
  for (const e of entries) {
    const u = byUser.get(e.userId) ?? { name: e.userName, minutes: 0 };
    u.minutes += e.minutes;
    byUser.set(e.userId, u);
  }

  return (
    <div className="space-y-6">
      {/* Итоги недели */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border px-4 py-2.5">
          <div className="text-xs text-muted-foreground">Всего за неделю</div>
          <div className="text-lg font-bold">{formatHours(weekTotal)}</div>
        </div>
        {[...byUser.values()].map((u) => (
          <div key={u.name} className="rounded-lg border px-4 py-2.5">
            <div className="text-xs text-muted-foreground">{u.name}</div>
            <div className="text-lg font-bold">{formatHours(u.minutes)}</div>
          </div>
        ))}
      </div>

      {days.length === 0 && (
        <p className="text-sm text-muted-foreground">
          За эту неделю время не вносилось
        </p>
      )}

      {days.map(([dayKey, dayEntries]) => {
        const dayTotal = dayEntries.reduce((s, e) => s + e.minutes, 0);
        return (
          <div key={dayKey} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">
                {formatDate(new Date(dayKey))}
              </h3>
              <span className="text-sm text-muted-foreground">
                {formatHours(dayTotal)}
              </span>
            </div>
            <div className="divide-y rounded-lg border">
              {dayEntries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      <span className="font-medium">{e.userName}</span>
                      <span className="text-muted-foreground"> · {e.taskTitle}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.projectName}
                      {e.isManual && " · вручную"}
                      {e.description && ` · ${e.description}`}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-medium tabular-nums">
                      {formatHours(e.minutes)}
                    </span>
                    <ConfirmDelete
                      title="Удалить запись времени?"
                      action={deleteTimeEntryAction.bind(null, e.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="Удалить запись"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
