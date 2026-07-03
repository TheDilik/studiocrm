"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ClientStatus } from "@prisma/client";
import { createClientAction, updateClientAction } from "@/app/actions/clients";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLIENT_STATUS } from "@/lib/labels";

const NONE = "__none__";

export type ClientFormValues = {
  companyName: string;
  industry: string;
  source: string;
  status: ClientStatus;
  notes: string;
  managerId: string;
};

export function ClientFormDialog({
  trigger,
  managers,
  clientId,
  initial,
}: {
  trigger: ReactNode;
  managers: { id: string; name: string }[];
  clientId?: string; // если задан — режим редактирования
  initial?: ClientFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ClientStatus>(initial?.status ?? "LEAD");
  const [managerId, setManagerId] = useState(initial?.managerId || NONE);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      companyName: fd.get("companyName") as string,
      industry: fd.get("industry") as string,
      source: fd.get("source") as string,
      status,
      notes: fd.get("notes") as string,
      managerId: managerId === NONE ? "" : managerId,
      contactName: fd.get("contactName") as string,
      contactPhone: fd.get("contactPhone") as string,
      contactEmail: fd.get("contactEmail") as string,
      contactTelegram: fd.get("contactTelegram") as string,
    };
    const result = clientId
      ? await updateClientAction(clientId, input)
      : await createClientAction(input);
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
            {clientId ? "Редактировать клиента" : "Новый клиент"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Название компании *</Label>
            <Input
              id="companyName"
              name="companyName"
              required
              defaultValue={initial?.companyName}
              placeholder="ООО «Ромашка»"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">Сфера деятельности</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={initial?.industry}
                placeholder="Доставка цветов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Источник</Label>
              <Input
                id="source"
                name="source"
                defaultValue={initial?.source}
                placeholder="Рекомендация"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_STATUS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Менеджер</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Не назначен</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={initial?.notes}
              placeholder="Особенности работы с клиентом..."
            />
          </div>
          {!clientId && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Основной контакт</p>
              <p className="text-xs text-muted-foreground">
                Необязательно — остальных контактов можно добавить позже на странице клиента
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Имя</Label>
                  <Input id="contactName" name="contactName" placeholder="Ольга Петрова" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Телефон</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    placeholder="+7 900 000-00-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactTelegram">Telegram</Label>
                  <Input
                    id="contactTelegram"
                    name="contactTelegram"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
