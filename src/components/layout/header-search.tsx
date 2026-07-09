"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Role } from "@prisma/client";
import { Input } from "@/components/ui/input";

/**
 * Глобальный поиск в шапке (дизайн v2). Ведёт в раздел с поддержкой
 * поиска по роли: менеджеры ищут клиентов, сотрудники — задачи.
 */
export function HeaderSearch({ role }: { role: Role }) {
  const router = useRouter();
  const target = role === "EMPLOYEE" ? "/tasks" : "/clients";
  const placeholder =
    role === "EMPLOYEE" ? "Поиск задач..." : "Поиск клиентов...";

  return (
    <form
      className="relative hidden w-full max-w-xs sm:block"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q") as string;
        router.push(`${target}?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        placeholder={placeholder}
        className="h-9 rounded-full bg-muted/60 pl-8 focus-visible:bg-background"
      />
    </form>
  );
}
