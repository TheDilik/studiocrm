import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Пилюля «▲ 24% к прошлому месяцу». `invert` — для метрик, где рост это
 * плохо (расходы): стрелка вверх остаётся, но красится в красный.
 */
export function TrendBadge({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (previous <= 0) return null; // не с чем сравнивать
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  const isUp = pct > 0;
  const isGood = invert ? !isUp : isUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
        isGood
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400"
      )}
      title="К прошлому месяцу"
    >
      {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(pct)}%
    </span>
  );
}
