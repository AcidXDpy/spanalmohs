import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-4xl">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
          {Icon && <Icon className="size-4" />}
          <span>{eyebrow}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {badge && (
        <Badge variant="outline" className="w-fit font-mono">
          {badge}
        </Badge>
      )}
    </div>
  );
}
