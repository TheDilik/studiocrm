import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { canManageClients, requireSession } from "@/lib/rbac";
import { AccessDenied } from "@/components/access-denied";
import { listClients, listClientSources } from "@/lib/services/clients";
import { listOrgUsers } from "@/lib/services/projects";
import { clientFiltersSchema } from "@/lib/validators/client";
import { formatDate } from "@/lib/format";
import { CLIENT_STATUS } from "@/lib/labels";
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
import { ClientsToolbar } from "./clients-toolbar";
import { ClientFormDialog } from "./client-form-dialog";

export const metadata = { title: "Клиенты — StudioCRM" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireSession();
  if (!canManageClients(ctx.role)) return <AccessDenied />;
  const filters = clientFiltersSchema.parse(await searchParams);

  const [clients, sources, users] = await Promise.all([
    listClients(ctx, filters),
    listClientSources(ctx),
    listOrgUsers(ctx),
  ]);
  const managers = users.filter((u) => u.role === "OWNER" || u.role === "MANAGER");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Клиенты</h1>
        <ClientFormDialog
          managers={managers}
          trigger={
            <Button>
              <Plus className="size-4" />
              Новый клиент
            </Button>
          }
        />
      </div>

      <ClientsToolbar sources={sources} managers={managers} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Компания</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="hidden md:table-cell">Контакт</TableHead>
              <TableHead className="hidden lg:table-cell">Источник</TableHead>
              <TableHead className="hidden lg:table-cell">Менеджер</TableHead>
              <TableHead className="hidden sm:table-cell text-center">
                Проекты
              </TableHead>
              <TableHead className="hidden xl:table-cell">Обновлён</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            )}
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium hover:underline"
                  >
                    {client.companyName}
                  </Link>
                  {client.industry && (
                    <div className="text-xs text-muted-foreground">
                      {client.industry}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge {...CLIENT_STATUS[client.status]} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {client.contacts[0] ? (
                    <div>
                      <div className="text-sm">{client.contacts[0].name}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.contacts[0].phone ?? client.contacts[0].email ?? ""}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {client.source ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {client.manager?.name ?? "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-center">
                  {client._count.projects}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                  {formatDate(client.updatedAt)}
                </TableCell>
                <TableCell>
                  <ClientFormDialog
                    clientId={client.id}
                    managers={managers}
                    initial={{
                      companyName: client.companyName,
                      industry: client.industry ?? "",
                      source: client.source ?? "",
                      status: client.status,
                      notes: client.notes ?? "",
                      managerId: client.managerId ?? "",
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Редактировать «${client.companyName}»`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
