import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ChatPanel } from "@/components/ai/chat-panel";
import { requireSession } from "@/lib/rbac";
import {
  checkUpcomingDeadlines,
  listNotifications,
  countUnread,
} from "@/lib/services/notifications";
import { checkOverduePayments } from "@/lib/services/finance";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, name, email } = session.user;

  const ctx = await requireSession();
  // Фоновые проверки (до подключения полноценного крона)
  await Promise.all([
    checkUpcomingDeadlines(ctx.organizationId),
    checkOverduePayments(ctx.organizationId),
  ]);
  const [notificationItems, unreadCount] = await Promise.all([
    listNotifications(ctx),
    countUnread(ctx),
  ]);

  return (
    <div className="flex min-h-screen">
      {/* Боковая панель (десктоп) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b px-5">
          <span className="text-lg font-semibold tracking-tight">
            StudioCRM
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav role={role} />
        </div>
      </aside>

      {/* Основная область */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <MobileNav role={role} />
          <div className="flex-1" />
          <NotificationsBell initialItems={notificationItems} initialUnread={unreadCount} />
          <ThemeToggle />
          <UserMenu name={name ?? email} email={email} role={role} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <ChatPanel />
    </div>
  );
}
