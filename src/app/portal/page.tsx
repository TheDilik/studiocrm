import Link from "next/link";
import { requireSession } from "@/lib/rbac";
import { listPortalProjects } from "@/lib/services/portal";
import { formatDate, formatMoney } from "@/lib/format";
import { PROJECT_STATUS } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Мои проекты — StudioCRM" };

export default async function PortalPage() {
  const ctx = await requireSession();
  const projects = await listPortalProjects(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Мои проекты</h1>

      {projects.length === 0 && (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Проектов пока нет
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((project) => {
          const done = project.milestones.filter((m) => m.status === "APPROVED" || m.status === "DONE").length;
          return (
            <Link key={project.id} href={`/portal/${project.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{project.name}</span>
                    <StatusBadge {...PROJECT_STATUS[project.status]} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Бюджет: {formatMoney(project.budget)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Дедлайн: {formatDate(project.deadline)}
                  </div>
                  {project.milestones.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Этапов завершено: {done} из {project.milestones.length}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
