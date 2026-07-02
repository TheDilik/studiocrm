// Деньги хранятся в минорных единицах (Int). Здесь — единственное место конвертации для UI.

const CURRENCY_LOCALES: Record<string, string> = {
  RUB: "ru-RU",
  USD: "en-US",
  UZS: "uz-UZ",
  KZT: "kk-KZ",
};

/** 12345600 (копейки) → "123 456 ₽" */
export function formatMoney(minor: number, currency = "RUB"): string {
  const locale = CURRENCY_LOCALES[currency] ?? "ru-RU";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

/** Рубли из формы → минорные единицы для БД */
export function toMinor(major: number): number {
  return Math.round(major * 100);
}

/** Минорные единицы → рубли для input value */
export function toMajor(minor: number): number {
  return minor / 100;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    new Date(date)
  );
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/** Для input type="date" */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}
