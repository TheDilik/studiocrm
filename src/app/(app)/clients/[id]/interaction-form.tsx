"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InteractionType } from "@prisma/client";
import { addInteractionAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTERACTION_TYPE } from "@/lib/labels";

export function InteractionForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [type, setType] = useState<InteractionType>("CALL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const result = await addInteractionAction(clientId, {
      type,
      note: fd.get("note") as string,
      date: fd.get("date") as string,
    });
    setPending(false);
    if (result.ok) {
      form.reset();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INTERACTION_TYPE).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="datetime-local"
          name="date"
          className="w-fit"
          defaultValue={new Date().toISOString().slice(0, 16)}
          required
        />
      </div>
      <Textarea
        name="note"
        rows={2}
        required
        placeholder="Что обсудили, о чём договорились..."
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Добавление..." : "Добавить запись"}
      </Button>
    </form>
  );
}
