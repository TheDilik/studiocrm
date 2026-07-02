"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus, ProjectType } from "@prisma/client";
import { createProjectAction, updateProjectAction } from "@/app/actions/projects";
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
import { PROJECT_STATUS, PROJECT_TYPE } from "@/lib/labels";

const NONE = "__none__";

export type ProjectFormValues = {
  clientId: string;
  name: string;
  type: ProjectType;
  budgetMajor: number;
  startDate: string; // yyyy-mm-dd или ""
  deadline: string;
  status: ProjectStatus;
  managerId: string;
  memberIds: string[];
};

export function ProjectFormDialog({
  trigger,
  clients,
  users,
  projectId,
  initial,
}: {
  trigger: ReactNode;
  clients: { id: string; companyName: string }[];
  users: { id: string; name: string; role: string }[];
  projectId?: string;
  initial?: ProjectFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [type, setType] = useState<ProjectType>(initial?.type ?? "WEBSITE");
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? "NEGOTIATION");
  const [managerId, setManagerId] = useState(initial?.managerId || NONE);
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);

  const managers = users.filter((u) => u.role === "OWNER" || u.role === "MANAGER");

  const toggleMember = (userId: string) =>
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      clientId,
      name: fd.get("name") as string,
      type,
      budgetMajor: fd.get("budgetMajor") as string,
      startDate: (fd.get("startDate") as string) || null,
      deadline: (fd.get("deadline") as string) || null,
      status,
      managerId: managerId === NONE ? "" : managerId,
      memberIds,
    };
    const result = projectId
      ? await updateProjectAction(projectId, input)
      : await createProjectAction(input);
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
            {projectId ? "Редактировать проект" : "Новый проект"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Клиент *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
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
            <Label htmlFor="name">Название проекта *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial?.name}
              placeholder="Корпоративный сайт"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetMajor">Бюджет, ₽</Label>
              <Input
                id="budgetMajor"
                name="budgetMajor"
                type="number"
                min="0"
                step="1000"
                defaultValue={initial?.budgetMajor ?? 0}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Дата начала</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={initial?.startDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Дедлайн</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={initial?.deadline}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_STATUS).map(([value, { label }]) => (
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
            <Label>Команда</Label>
            <div className="grid gap-1.5 rounded-lg border p-3 sm:grid-cols-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={memberIds.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="size-4 accent-primary"
                  />
                  {u.name}
                </label>
              ))}
            </div>
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
