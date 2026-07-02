// Простой SVG-график доход/расход по месяцам (без клиентского JS).
import { formatMoney } from "@/lib/format";

export function MonthlyChart({
  months,
}: {
  months: { key: string; label: string; income: number; expense: number }[];
}) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const H = 160;

  return (
    <div>
      <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ height: H + 40 }}>
        {months.map((m) => {
          const ih = Math.round((m.income / max) * H);
          const eh = Math.round((m.expense / max) * H);
          return (
            <div key={m.key} className="flex min-w-12 flex-1 flex-col items-center gap-1">
              <div className="flex h-40 items-end gap-1">
                <div
                  className="w-4 rounded-t bg-emerald-500/80"
                  style={{ height: Math.max(m.income > 0 ? 3 : 0, ih) }}
                  title={`Доход: ${formatMoney(m.income)}`}
                />
                <div
                  className="w-4 rounded-t bg-red-400/80"
                  style={{ height: Math.max(m.expense > 0 ? 3 : 0, eh) }}
                  title={`Расход: ${formatMoney(m.expense)}`}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">{m.label}</span>
            </div>
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
