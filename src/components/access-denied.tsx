import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Недостаточно прав</h2>
        <p className="text-sm text-muted-foreground">
          Этот раздел недоступен для вашей роли
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">На дашборд</Link>
      </Button>
    </div>
  );
}
