"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addManualTimeAction } from "@/app/actions/tasks";
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

export function ManualTimeDialog({
  trigger,
  tasks,
}: {
  trigger: ReactNode;
  tasks: { id: string; title: string; projectName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await addManualTimeAction({
      taskId,
      date: fd.get("date") as string,
      hours: fd.get("hours") as string,
      minutes: fd.get("minutes") as string,
      description: fd.get("description") as string,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Внести время вручную</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Задача *</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите задачу" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} · {t.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Дата *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Часы</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                min="0"
                max="24"
                defaultValue="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes">Минуты</Label>
              <Input
                id="minutes"
                name="minutes"
                type="number"
                min="0"
                max="59"
                defaultValue="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Комментарий</Label>
            <Input
              id="description"
              name="description"
              placeholder="Что делали..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending || !taskId}>
              {pending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
