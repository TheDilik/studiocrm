import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { getDesignVersion } from "@/lib/design-server";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/");

  const { name, email, role } = session.user;
  const design = await getDesignVersion();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <span className="text-lg font-semibold tracking-tight">StudioCRM</span>
        <span className="text-sm text-muted-foreground">· Портал клиента</span>
        <div className="flex-1" />
        <ThemeToggle />
        <UserMenu name={name ?? email} email={email} role={role} design={design} />
      </header>
      <main className="mx-auto max-w-4xl p-4 md:p-6">{children}</main>
    </div>
  );
}
