import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderKanban, ListTodo, Users, Wallet } from "lucide-react";

export const metadata = { title: "Дашборд — StudioCRM" };

export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  // Простая сводка для фазы 1; полный дашборд — в фазе 4
  const [clients, projects, tasks, employees] = await Promise.all([
    prisma.client.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.project.count({ where: { organizationId, status: "IN_PROGRESS" } }),
    prisma.task.count({
      where: { organizationId, status: { not: "DONE" } },
    }),
    prisma.employee.count({ where: { organizationId, isActive: true } }),
  ]);

  const cards = [
    { title: "Активные клиенты", value: clients, icon: Users },
    { title: "Проекты в работе", value: projects, icon: FolderKanban },
    { title: "Открытые задачи", value: tasks, icon: ListTodo },
    { title: "Сотрудники", value: employees, icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Финансовая сводка, задачи на сегодня и активность появятся в следующих
        фазах.
      </p>
    </div>
  );
}
