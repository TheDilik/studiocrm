import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Модуль «{title}» будет реализован в {phase}.
        </CardContent>
      </Card>
    </div>
  );
}
