"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { RateType } from "@prisma/client";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

export type EmployeeFormValues = {
  fullName: string;
  position: string;
  rateType: RateType;
  rateMajor: number;
  hireDate: string;
  phone: string;
  email: string;
  userId: string;
  isActive: boolean;
};

export function EmployeeFormDialog({
  trigger,
  users,
  employeeId,
  initial,
}: {
  trigger: ReactNode;
  users: { id: string; name: string }[];
  employeeId?: string;
  initial?: EmployeeFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateType, setRateType] = useState<RateType>(initial?.rateType ?? "HOURLY");
  const [userId, setUserId] = useState(initial?.userId || NONE);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      fullName: fd.get("fullName") as string,
      position: fd.get("position") as string,
      rateType,
      rateMajor: fd.get("rateMajor") as string,
      hireDate: (fd.get("hireDate") as string) || null,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      userId: userId === NONE ? "" : userId,
      isActive: fd.get("isActive") === "on",
    };
    const result = employeeId
      ? await updateEmployeeAction(employeeId, input)
      : await createEmployeeAction(input);
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {employeeId ? "Редактировать сотрудника" : "Новый сотрудник"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">ФИО *</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              defaultValue={initial?.fullName}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="position">Должность</Label>
              <Input
                id="position"
                name="position"
                defaultValue={initial?.position}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hireDate">Дата найма</Label>
              <Input
                id="hireDate"
                name="hireDate"
                type="date"
                defaultValue={initial?.hireDate}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип ставки</Label>
              <Select
                value={rateType}
                onValueChange={(v) => setRateType(v as RateType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOURLY">Почасовая</SelectItem>
                  <SelectItem value="MONTHLY">Фикс в месяц</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateMajor">
                Ставка, {rateType === "HOURLY" ? "₽/час" : "₽/мес"}
              </Label>
              <Input
                id="rateMajor"
                name="rateMajor"
                type="number"
                min="0"
                step="100"
                defaultValue={initial?.rateMajor ?? 0}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" defaultValue={initial?.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initial?.email}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Учётная запись</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Без учётной записи</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Привязка к учётной записи нужна для задач и трекинга времени
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initial?.isActive ?? true}
              className="size-4 accent-primary"
            />
            Работает (активен)
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
