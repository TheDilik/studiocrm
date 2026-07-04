import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { getPortalProject } from "@/lib/services/portal";
import { formatDate, formatMoney } from "@/lib/format";
import { PROJECT_STATUS } from "@/lib/labels";
import { StatusBadge } from "@/components/status-badge";
import { MilestoneCard } from "./milestone-card";

export const metadata = { title: "Проект — StudioCRM" };

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const ctx = await requireSession();
  const { projectId } = await params;
  const project = await getPortalProject(ctx, projectId);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Все проекты
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <StatusBadge {...PROJECT_STATUS[project.status]} />
        </div>
        <div className="text-sm text-muted-foreground">
          {project.type} · бюджет {formatMoney(project.budget)} · до{" "}
          {formatDate(project.deadline)}
          {project.manager?.name && <> · менеджер: {project.manager.name}</>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Этапы</h2>
        {project.milestones.length === 0 && (
          <p className="text-sm text-muted-foreground">Этапы пока не добавлены</p>
        )}
        {project.milestones.map((m, i) => (
          <MilestoneCard key={m.id} milestone={m} index={i} />
        ))}
      </div>
    </div>
  );
}
