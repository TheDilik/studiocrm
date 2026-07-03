"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { formatDateTime } from "@/lib/format";
import { NOTIFICATION_ICON } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: keyof typeof NOTIFICATION_ICON;
  isRead: boolean;
  createdAt: string | Date;
  entityType: string | null;
  entityId: string | null;
};

// Куда вести по клику, если у уведомления есть привязанная сущность
const ENTITY_HREF: Record<string, (id: string) => string> = {
  task: () => "/tasks",
  payment: () => "/finance",
};

export function NotificationsBell({
  initialItems,
  initialUnread,
}: {
  initialItems: NotificationItem[];
  initialUnread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  async function handleItemClick(item: NotificationItem) {
    if (!item.isRead) {
      startTransition(() => {
        markNotificationReadAction(item.id).then(() => router.refresh());
      });
    }
  }

  async function handleMarkAll() {
    startTransition(() => {
      markAllNotificationsReadAction().then(() => router.refresh());
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Уведомления">
          <Bell className="size-4" />
          {initialUnread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-red-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Уведомления</span>
          {initialUnread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs"
              onClick={handleMarkAll}
            >
              <Check className="size-3" /> Прочитать всё
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {initialItems.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Уведомлений пока нет
            </p>
          )}
          <div className="divide-y">
            {initialItems.map((item) => {
              const href =
                item.entityType && item.entityId
                  ? ENTITY_HREF[item.entityType]?.(item.entityId)
                  : undefined;
              const content = (
                <div
                  className={cn(
                    "flex gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-accent/50",
                    !item.isRead && "bg-accent/30"
                  )}
                >
                  <span className="text-base leading-none">
                    {NOTIFICATION_ICON[item.type] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{item.title}</span>
                      {!item.isRead && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {item.body && (
                      <p className="text-xs text-muted-foreground">{item.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return href ? (
                <Link
                  key={item.id}
                  href={href}
                  onClick={() => {
                    handleItemClick(item);
                    setOpen(false);
                  }}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => handleItemClick(item)}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
