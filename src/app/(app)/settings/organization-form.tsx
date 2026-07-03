"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationSettingsAction } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/validators/organization";

const CURRENCY_LABEL: Record<string, string> = {
  RUB: "₽ Российский рубль",
  USD: "$ Доллар США",
  UZS: "Узбекский сум",
  KZT: "₸ Казахстанский тенге",
};

const TIMEZONES = [
  "Europe/Kaliningrad",
  "Europe/Moscow",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Tashkent",
  "Asia/Almaty",
];

const DATE_FORMATS = ["dd.MM.yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];

export function OrganizationForm({
  initial,
}: {
  initial: { name: string; currency: string; timezone: string; dateFormat: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currency, setCurrency] = useState(initial.currency);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [dateFormat, setDateFormat] = useState(initial.dateFormat);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const result = await updateOrganizationSettingsAction({
      name: fd.get("name") as string,
      currency,
      timezone,
      dateFormat,
    });
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Название организации</Label>
        <Input id="name" name="name" required defaultValue={initial.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Валюта</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_LABEL[c] ?? c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Часовой пояс</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Формат даты</Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && !error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Сохранено</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Сохранение..." : "Сохранить"}
      </Button>
    </form>
  );
}
