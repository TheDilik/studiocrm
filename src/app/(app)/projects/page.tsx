import Link from "next/link";
import { Plus } from "lucide-react";
import { canManageClients, requireSession } from "@/lib/rbac";
import { listProjects, listOrgUsers } from "@/lib/services/projects";
import { listClients } from "@/lib/services/clients";
import { projectFiltersSchema } from "@/lib/validators/project";
import { formatDate, formatMoney } from "@/lib/format";
import { PROJECT_STATUS, PROJECT_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ProjectsToolbar } from "./projects-toolbar";
import { ProjectFormDialog } from "./project-form-dialog";

export const metadata = { title: "Проекты — StudioCRM" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  const filters = projectFiltersSchema.parse(await searchParams);
  const canManage = canManageClients(ctx.role);

  const [projects, users, clients] = await Promise.all([
    listProjects(ctx, filters),
    listOrgUsers(ctx),
    canManage ? listClients(ctx, {}) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
        {canManage && (
          <ProjectFormDialog
            clients={clients.map((c) => ({ id: c.id, companyName: c.companyName }))}
            users={users}
            trigger={
              <Button>
                <Plus className="size-4" />
                Новый проект
              </Button>
            }
          />
        )}
      </div>

      <ProjectsToolbar
        clients={
          canManage
            ? clients.map((c) => ({ id: c.id, companyName: c.companyName }))
            : []
        }
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Проект</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="hidden md:table-cell">Клиент</TableHead>
              <TableHead className="hidden lg:table-cell">Тип</TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                Бюджет
              </TableHead>
              <TableHead className="hidden lg:table-cell">Дедлайн</TableHead>
              <TableHead className="hidden xl:table-cell text-center">
                Задачи
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Проекты не найдены
                </TableCell>
              </TableRow>
            )}
            {projects.map((project) => {
              const overdue =
                project.deadline &&
                project.status === "IN_PROGRESS" &&
                new Date(project.deadline) < new Date();
              return (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {project.manager?.name ?? "Менеджер не назначен"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge {...PROJECT_STATUS[project.status]} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {project.client.companyName}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {PROJECT_TYPE[project.type]}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right text-sm font-medium">
                    {formatMoney(project.budget)}
                  </TableCell>
                  <TableCell
                    className={`hidden lg:table-cell text-sm ${
                      overdue ? "font-medium text-destructive" : ""
                    }`}
                  >
                    {formatDate(project.deadline)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-center text-sm">
                    {project._count.tasks}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
