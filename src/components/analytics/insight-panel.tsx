import { AlertTriangle, CheckCircle2, CircleDot, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneIcon = {
  opportunity: CheckCircle2,
  risk: AlertTriangle,
  note: Info,
  signal: CircleDot,
};

export function InsightPanel({
  title,
  insights,
}: {
  title: string;
  insights: Array<{ label: string; body: string; tone: keyof typeof toneIcon; confidence?: number }>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Badge variant="outline" className="font-mono">
          Model-generated
        </Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon = toneIcon[insight.tone];

          return (
            <Alert key={insight.label} className="bg-card">
              <Icon
                className={cn(
                  "size-4",
                  insight.tone === "risk" && "text-amber-200",
                  insight.tone === "opportunity" && "text-emerald-200"
                )}
              />
              <AlertTitle className="flex items-center justify-between gap-3">
                <span>{insight.label}</span>
                {insight.confidence !== undefined && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(insight.confidence * 100)}%
                  </span>
                )}
              </AlertTitle>
              <AlertDescription className="leading-6">{insight.body}</AlertDescription>
            </Alert>
          );
        })}
      </div>
    </section>
  );
}
