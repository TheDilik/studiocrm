import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { getClient } from "@/lib/services/clients";
import { listOrgUsers } from "@/lib/services/projects";
import {
  deleteClientAction,
  deleteContactAction,
  deleteInteractionAction,
} from "@/app/actions/clients";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  CLIENT_STATUS,
  INTERACTION_TYPE,
  PAYMENT_KIND,
  PAYMENT_STATUS,
  PROJECT_STATUS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ClientFormDialog } from "../client-form-dialog";
import { ProjectFormDialog } from "../../projects/project-form-dialog";
import { ContactDialog } from "./contact-dialog";
import { InteractionForm } from "./interaction-form";
import { PortalAccessCard } from "./portal-access-card";

export const metadata = { title: "Клиент — StudioCRM" };

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;

  const [client, users] = await Promise.all([
    getClient(ctx, id),
    listOrgUsers(ctx),
  ]);
  if (!client) notFound();
  const managers = users.filter((u) => u.role === "OWNER" || u.role === "MANAGER");

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Все клиенты
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.companyName}
            </h1>
            <StatusBadge {...CLIENT_STATUS[client.status]} />
          </div>
          <div className="text-sm text-muted-foreground">
            {[client.industry, client.source && `Источник: ${client.source}`]
              .filter(Boolean)
              .join(" · ") || " "}
          </div>
        </div>
        <div className="flex gap-2">
          <ClientFormDialog
            clientId={client.id}
            managers={managers}
            contacts={client.contacts}
            initial={{
              companyName: client.companyName,
              industry: client.industry ?? "",
              source: client.source ?? "",
              status: client.status,
              notes: client.notes ?? "",
              managerId: client.managerId ?? "",
            }}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" /> Редактировать
              </Button>
            }
          />
          <ConfirmDelete
            title={`Удалить клиента «${client.companyName}»?`}
            description="Будут удалены все проекты, контакты и история взаимодействий."
            action={deleteClientAction.bind(null, client.id)}
            redirectTo="/clients"
            trigger={
              <Button variant="outline" size="icon" aria-label="Удалить клиента">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Сводка */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Проектов
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {client.summary.projectCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Оплачено всего
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatMoney(client.summary.totalPaid)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ожидается
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatMoney(client.summary.totalExpected)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Контакты */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Контактные лица</CardTitle>
            <ContactDialog
              clientId={client.id}
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="size-4" /> Добавить
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {client.contacts.length === 0 && (
              <p className="text-sm text-muted-foreground">Контактов пока нет</p>
            )}
            {client.contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-start justify-between gap-2 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {contact.name}
                    {contact.isPrimary && (
                      <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                        основной
                      </span>
                    )}
                  </div>
                  {contact.position && (
                    <div className="text-xs text-muted-foreground">
                      {contact.position}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {contact.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" /> {contact.phone}
                      </span>
                    )}
                    {contact.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" /> {contact.email}
                      </span>
                    )}
                    {contact.telegram && (
                      <span className="inline-flex items-center gap-1">
                        <Send className="size-3" /> {contact.telegram}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <ContactDialog
                    clientId={client.id}
                    contact={contact}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Редактировать контакт">
                        <Pencil className="size-3.5" />
                      </Button>
                    }
                  />
                  <ConfirmDelete
                    title={`Удалить контакт «${contact.name}»?`}
                    action={deleteContactAction.bind(null, client.id, contact.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Удалить контакт">
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Проекты и платежи */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Проекты</CardTitle>
              <ProjectFormDialog
                clients={[{ id: client.id, companyName: client.companyName }]}
                users={users}
                initial={{
                  clientId: client.id,
                  name: "",
                  type: "WEBSITE",
                  budgetMajor: 0,
                  startDate: "",
                  deadline: "",
                  status: "NEGOTIATION",
                  managerId: client.managerId ?? "",
                  memberIds: [],
                }}
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" /> Добавить
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {client.projects.length === 0 && (
                <p className="text-sm text-muted-foreground">Проектов пока нет</p>
              )}
              {client.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  <div>
                    <div className="text-sm font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      до {formatDate(project.deadline)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatMoney(project.budget)}
                    </span>
                    <StatusBadge {...PROJECT_STATUS[project.status]} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Платежи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {client.payments.length === 0 && (
                <p className="text-sm text-muted-foreground">Платежей пока нет</p>
              )}
              {client.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {formatMoney(payment.amount)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {PAYMENT_KIND[payment.kind]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {payment.project?.name ?? "Без проекта"} ·{" "}
                      {payment.status === "RECEIVED"
                        ? formatDate(payment.paidAt)
                        : `срок ${formatDate(payment.dueDate)}`}
                    </div>
                  </div>
                  <StatusBadge {...PAYMENT_STATUS[payment.status]} />
                </div>
              ))}
            </CardContent>
          </Card>

          <PortalAccessCard clientId={client.id} portalUser={client.portalUser} />
        </div>
      </div>

      {/* Заметки */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Заметки</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {client.notes}
          </CardContent>
        </Card>
      )}

      {/* Журнал взаимодействий */}
      <Card>
        <CardHeader>
          <CardTitle>История взаимодействий</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InteractionForm clientId={client.id} />
          <Separator />
          {client.interactions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Записей пока нет — добавьте первую
            </p>
          )}
          <div className="space-y-3">
            {client.interactions.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {INTERACTION_TYPE[item.type]}
                    </span>{" "}
                    · {formatDateTime(item.date)}
                    {item.author?.name && ` · ${item.author.name}`}
                  </div>
                  <p className="text-sm">{item.note}</p>
                </div>
                <ConfirmDelete
                  title="Удалить запись из журнала?"
                  action={deleteInteractionAction.bind(null, client.id, item.id)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Удалить запись">
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
