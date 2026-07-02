// Календарь недели: сотрудник × день — задачи с дедлайном и отработанные часы.
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import { TASK_STATUS } from "@/lib/labels";
import { addDays, localDayKey } from "@/lib/services/time";
import type { getWeekBoard } from "@/lib/services/time";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarView({
  board,
  weekStart,
}: {
  board: Awaited<ReturnType<typeof getWeekBoard>>;
  weekStart: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = localDayKey(new Date());

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-4xl border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="w-44 px-3 py-2 text-left font-medium">Сотрудник</th>
            {days.map((day, i) => {
              const key = localDayKey(day);
              const isToday = key === todayKey;
              return (
                <th
                  key={key}
                  className={cn(
                    "border-l px-2 py-2 text-center font-medium",
                    isToday && "bg-primary/5 text-primary"
                  )}
                >
                  {DAY_NAMES[i]}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {day.getDate()}.{String(day.getMonth() + 1).padStart(2, "0")}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {board.length === 0 && (
            <tr>
              <td colSpan={8} className="h-24 text-center text-muted-foreground">
                Нет данных
              </td>
            </tr>
          )}
          {board.map((row) => (
            <tr key={row.user.id} className="border-b last:border-0">
              <td className="px-3 py-2 align-top font-medium">{row.user.name}</td>
              {days.map((day) => {
                const key = localDayKey(day);
                const cell = row.byDay[key];
                const isToday = key === todayKey;
                return (
                  <td
                    key={key}
                    className={cn(
                      "min-w-32 border-l px-1.5 py-1.5 align-top",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <div className="space-y-1">
                      {cell?.tasks.map((t) => (
                        <div
                          key={t.id}
                          className={cn(
                            "rounded px-1.5 py-1 text-xs leading-tight",
                            TASK_STATUS[t.status].className
                          )}
                          title={`${t.title} · ${t.project.name}`}
                        >
                          {t.title}
                        </div>
                      ))}
                      {cell && cell.minutes > 0 && (
                        <div className="px-1.5 text-[11px] font-medium text-muted-foreground">
                          ⏱ {formatHours(cell.minutes)}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
