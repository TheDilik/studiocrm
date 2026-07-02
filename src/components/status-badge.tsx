import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", className)}>
      {label}
    </Badge>
  );
}
