"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2 } from "lucide-react";
import {
  createPortalAccessAction,
  revokePortalAccessAction,
} from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDelete } from "@/components/confirm-delete";

export function PortalAccessCard({
  clientId,
  portalUser,
}: {
  clientId: string;
  portalUser: { id: string; email: string } | null;
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
    const result = await createPortalAccessAction(clientId, {
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    });
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Доступ к порталу
        </CardTitle>
      </CardHeader>
      <CardContent>
        {portalUser ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">
              Подключён: <span className="font-medium">{portalUser.email}</span>
            </p>
            <ConfirmDelete
              title="Отключить доступ клиента к порталу?"
              description="Учётная запись клиента будет удалена, он больше не сможет войти."
              action={revokePortalAccessAction.bind(null, clientId)}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Отключить доступ">
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              }
            />
          </div>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Создать доступ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Доступ клиента к порталу</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email для входа *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    required
                    minLength={8}
                    placeholder="Минимум 8 символов"
                  />
                  <p className="text-xs text-muted-foreground">
                    Передайте эти данные клиенту — восстановление пароля пока не реализовано.
                  </p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Создание..." : "Создать"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
