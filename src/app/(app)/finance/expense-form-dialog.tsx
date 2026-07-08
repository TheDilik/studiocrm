"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseCategory } from "@prisma/client";
import { createExpenseAction, updateExpenseAction } from "@/app/actions/finance";
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
import { EXPENSE_CATEGORY } from "@/lib/labels";

const NONE = "__none__";

export type ExpenseFormValues = {
  category: ExpenseCategory;
  amountMajor: number;
  date: string;
  projectId: string;
  contractorName: string;
  description: string;
};

export function ExpenseFormDialog({
  trigger,
  projects,
  contractorNames,
  expenseId,
  initial,
}: {
  trigger: ReactNode;
  projects: { id: string; name: string }[];
  contractorNames?: string[];
  expenseId?: string;
  initial?: ExpenseFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>(
    initial?.category ?? "OTHER"
  );
  const [projectId, setProjectId] = useState(initial?.projectId || NONE);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      category,
      amountMajor: fd.get("amountMajor") as string,
      date: fd.get("date") as string,
      projectId: projectId === NONE ? "" : projectId,
      contractorName: (fd.get("contractorName") as string | null) ?? "",
      description: fd.get("description") as string,
    };
    const result = expenseId
      ? await updateExpenseAction(expenseId, input)
      : await createExpenseAction(input);
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
          <DialogTitle>{expenseId ? "Расход" : "Новый расход"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ExpenseCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORY).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountMajor">Сумма, ₽ *</Label>
              <Input
                id="amountMajor"
                name="amountMajor"
                type="number"
                min="0"
                step="500"
                required
                defaultValue={initial?.amountMajor}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Дата *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={initial?.date || new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label>Проект</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Без проекта</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {category === "CONTRACTOR" && (
            <div className="space-y-2">
              <Label htmlFor="contractorName">Исполнитель</Label>
              <Input
                id="contractorName"
                name="contractorName"
                list="contractor-name-suggestions"
                defaultValue={initial?.contractorName}
                placeholder="Имя подрядчика/фрилансера"
              />
              <datalist id="contractor-name-suggestions">
                {contractorNames?.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Нужно, чтобы собрать сводку выплат по исполнителям на странице «Сотрудники»
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              name="description"
              defaultValue={initial?.description}
            />
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
