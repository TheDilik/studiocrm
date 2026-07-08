// Простой SVG-график доход/расход по месяцам (без клиентского JS).
// Каждый столбец — ссылка, переключающая дашборд на этот месяц.
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MonthlyChart({
  months,
  activeMonthOffset,
  tab,
}: {
  months: {
    key: string;
    label: string;
    income: number;
    expense: number;
    monthOffset: number;
  }[];
  activeMonthOffset: number;
  tab?: string;
}) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const H = 160;

  const hrefFor = (offset: number) => {
    const params = new URLSearchParams();
    if (offset !== 0) params.set("month", String(offset));
    if (tab) params.set("tab", tab);
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <div>
      <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ height: H + 40 }}>
        {months.map((m) => {
          const ih = Math.round((m.income / max) * H);
          const eh = Math.round((m.expense / max) * H);
          const isActive = m.monthOffset === activeMonthOffset;
          return (
            <Link
              key={m.key}
              href={hrefFor(m.monthOffset)}
              className={cn(
                "flex min-w-12 flex-1 flex-col items-center gap-1 rounded-md py-1 transition-colors hover:bg-accent/50",
                isActive && "bg-accent"
              )}
              title={`${m.label}: доход ${formatMoney(m.income)}, расход ${formatMoney(m.expense)}`}
            >
              <div className="flex h-40 items-end gap-1">
                <div
                  className="w-4 rounded-t bg-emerald-500/80"
                  style={{ height: Math.max(m.income > 0 ? 3 : 0, ih) }}
                />
                <div
                  className="w-4 rounded-t bg-red-400/80"
                  style={{ height: Math.max(m.expense > 0 ? 3 : 0, eh) }}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] text-muted-foreground",
                  isActive && "font-semibold text-foreground"
                )}
              >
                {m.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500/80" /> Доход
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-red-400/80" /> Расход
        </span>
      </div>
    </div>
  );
}
