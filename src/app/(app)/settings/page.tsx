import { canManageSettings, requireSession } from "@/lib/rbac";
import { getOrganization } from "@/lib/services/organization";
import { getTelegramStatus } from "@/lib/services/telegram-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationForm } from "./organization-form";
import { TelegramCard } from "./telegram-card";

export const metadata = { title: "Настройки — StudioCRM" };

export default async function SettingsPage() {
  const ctx = await requireSession();
  const isOwner = canManageSettings(ctx.role);

  const [organization, telegram] = await Promise.all([
    isOwner ? getOrganization(ctx) : null,
    getTelegramStatus(ctx),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>

      <TelegramCard
        configured={telegram.configured}
        connected={telegram.connected}
        botUsername={telegram.botUsername}
      />

      {isOwner && organization && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Организация</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationForm
              initial={{
                name: organization.name,
                currency: organization.currency,
                timezone: organization.timezone,
                dateFormat: organization.dateFormat,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
