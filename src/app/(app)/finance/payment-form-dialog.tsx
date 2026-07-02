"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { PaymentKind, PaymentStatus } from "@prisma/client";
import { createPaymentAction, updatePaymentAction } from "@/app/actions/finance";
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
import { PAYMENT_KIND, PAYMENT_STATUS } from "@/lib/labels";

const NONE = "__none__";

export type PaymentFormValues = {
  clientId: string;
  projectId: string;
  amountMajor: number;
  method: string;
  kind: PaymentKind;
  status: PaymentStatus;
  dueDate: string;
  paidAt: string;
  note: string;
};

export function PaymentFormDialog({
  trigger,
  clients,
  projects,
  paymentId,
  initial,
}: {
  trigger: ReactNode;
  clients: { id: string; companyName: string }[];
  projects: { id: string; name: string; clientId: string }[];
  paymentId?: string;
  initial?: PaymentFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId || NONE);
  const [kind, setKind] = useState<PaymentKind>(initial?.kind ?? "INSTALLMENT");
  const [status, setStatus] = useState<PaymentStatus>(initial?.status ?? "EXPECTED");

  const clientProjects = projects.filter((p) => p.clientId === clientId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      clientId,
      projectId: projectId === NONE ? "" : projectId,
      amountMajor: fd.get("amountMajor") as string,
      method: fd.get("method") as string,
      kind,
      status,
      dueDate: (fd.get("dueDate") as string) || null,
      paidAt: (fd.get("paidAt") as string) || null,
      note: fd.get("note") as string,
    };
    const result = paymentId
      ? await updatePaymentAction(paymentId, input)
      : await createPaymentAction(input);
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
          <DialogTitle>{paymentId ? "Платёж" : "Новый платёж"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Клиент *</Label>
              <Select
                value={clientId}
                onValueChange={(v) => {
                  setClientId(v);
                  setProjectId(NONE);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Проект</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Без проекта</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amountMajor">Сумма, ₽ *</Label>
              <Input
                id="amountMajor"
                name="amountMajor"
                type="number"
                min="0"
                step="1000"
                required
                defaultValue={initial?.amountMajor}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PaymentKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_KIND).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PaymentStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_STATUS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Срок оплаты</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={initial?.dueDate}
              />
            </div>
            {status === "RECEIVED" && (
              <div className="space-y-2">
                <Label htmlFor="paidAt">Дата получения</Label>
                <Input
                  id="paidAt"
                  name="paidAt"
                  type="date"
                  defaultValue={
                    initial?.paidAt || new Date().toISOString().slice(0, 10)
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="method">Способ</Label>
              <Input
                id="method"
                name="method"
                placeholder="Безнал"
                defaultValue={initial?.method}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Комментарий</Label>
            <Input id="note" name="note" defaultValue={initial?.note} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending || !clientId}>
              {pending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
