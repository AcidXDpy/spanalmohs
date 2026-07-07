import type { MetricResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function MetricCard({
  metric,
  compact = false,
}: {
  metric: MetricResult;
  compact?: boolean;
}) {
  const delta = metric.value - metric.comparisonAverage;

  return (
    <Card className="min-h-[210px]" size={compact ? "sm" : "default"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm">{metric.name}</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "font-mono",
              delta >= 0 ? "border-emerald-300/30 text-emerald-200" : "border-amber-300/30 text-amber-200"
            )}
          >
            {delta >= 0 ? "+" : ""}
            {Math.round(delta * 100) / 100}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="font-mono text-2xl font-semibold">{metric.formattedValue}</div>
          <div className="mt-1 text-xs text-muted-foreground">{metric.interpretation}</div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Reliability</span>
            <span className="font-mono">{Math.round(metric.confidence * 100)}%</span>
          </div>
          <Progress value={metric.confidence * 100} />
        </div>
        {!compact && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-foreground">Method</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.formula}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
