"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import {
  disconnectTelegramAction,
  generateTelegramLinkCodeAction,
} from "@/app/actions/telegram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/confirm-delete";

export function TelegramCard({
  configured,
  connected,
  botUsername,
}: {
  configured: boolean;
  connected: boolean;
  botUsername: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await generateTelegramLinkCodeAction();
    setPending(false);
    if (result.ok) setCode(result.code);
    else setError(result.error);
  }

  const deepLink = code && botUsername ? `https://t.me/${botUsername}?start=${code}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="size-4" /> Telegram-уведомления
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Telegram-бот не настроен администратором сервера. Инструкция по
            подключению — в README проекта.
          </p>
        ) : connected ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Подключено — уведомления дублируются в Telegram
            </p>
            <ConfirmDelete
              title="Отключить Telegram-уведомления?"
              action={disconnectTelegramAction}
              trigger={
                <Button variant="outline" size="sm">
                  Отключить
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Получите код и отправьте его боту, чтобы уведомления StudioCRM
              приходили в Telegram.
            </p>
            {!code ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={handleGenerate}>
                {pending ? "Генерация..." : "Получить код"}
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                {deepLink ? (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline"
                  >
                    Открыть бота и привязать аккаунт
                  </a>
                ) : (
                  <p>
                    Отправьте боту команду:{" "}
                    <code className="rounded bg-background px-1.5 py-0.5">
                      /start {code}
                    </code>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Код действует 15 минут</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.refresh()}
                  className="h-7 px-2 text-xs"
                >
                  Я привязал(а) — обновить статус
                </Button>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
