"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addContactAction, updateContactAction } from "@/app/actions/clients";
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

export function ContactDialog({
  trigger,
  clientId,
  contact,
}: {
  trigger: ReactNode;
  clientId: string;
  contact?: {
    id: string;
    name: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    telegram: string | null;
    isPrimary: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: fd.get("name") as string,
      position: fd.get("position") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      telegram: fd.get("telegram") as string,
      isPrimary: fd.get("isPrimary") === "on",
    };
    const result = contact
      ? await updateContactAction(clientId, contact.id, input)
      : await addContactAction(clientId, input);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Редактировать контакт" : "Новое контактное лицо"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя *</Label>
            <Input id="name" name="name" required defaultValue={contact?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Должность</Label>
            <Input
              id="position"
              name="position"
              defaultValue={contact?.position ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={contact?.phone ?? ""}
                placeholder="+7 900 000-00-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                name="telegram"
                defaultValue={contact?.telegram ?? ""}
                placeholder="@username"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={contact?.email ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={contact?.isPrimary}
              className="size-4 accent-primary"
            />
            Основной контакт
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
