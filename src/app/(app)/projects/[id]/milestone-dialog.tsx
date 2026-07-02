"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { MilestoneStatus } from "@prisma/client";
import { addMilestoneAction, updateMilestoneAction } from "@/app/actions/projects";
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
import { MILESTONE_STATUS } from "@/lib/labels";
import { toDateInputValue, toMajor } from "@/lib/format";

export function MilestoneDialog({
  trigger,
  projectId,
  milestone,
}: {
  trigger: ReactNode;
  projectId: string;
  milestone?: {
    id: string;
    name: string;
    description: string | null;
    dueDate: Date | null;
    amount: number | null;
    status: MilestoneStatus;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MilestoneStatus>(
    milestone?.status ?? "PENDING"
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const amountRaw = fd.get("amountMajor") as string;
    const input = {
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      dueDate: (fd.get("dueDate") as string) || null,
      amountMajor: amountRaw ? Number(amountRaw) : null,
      status,
    };
    const result = milestone
      ? await updateMilestoneAction(projectId, milestone.id, input)
      : await addMilestoneAction(projectId, input);
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
            {milestone ? "Редактировать этап" : "Новый этап"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={milestone?.name}
              placeholder="Дизайн-макеты"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={milestone?.description ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Срок</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(milestone?.dueDate)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountMajor">Сумма, ₽</Label>
              <Input
                id="amountMajor"
                name="amountMajor"
                type="number"
                min="0"
                step="1000"
                defaultValue={
                  milestone?.amount != null ? toMajor(milestone.amount) : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MilestoneStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MILESTONE_STATUS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
