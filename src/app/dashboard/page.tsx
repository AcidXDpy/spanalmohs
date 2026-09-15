import { Suspense } from "react";

import { SeasonAnalysisDashboard } from "@/components/analytics/season-analysis-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { buildSeasonAnalysisDashboardData } from "@/lib/stats/football-dashboard";

function DashboardFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-36 w-full rounded-lg" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-[420px] rounded-lg" />
        <Skeleton className="h-[420px] rounded-lg" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dataset = getAnalyticsDataset();
  const dashboardData = buildSeasonAnalysisDashboardData(dataset);

  return (
    <div className="space-y-6">

      <Suspense fallback={<DashboardFallback />}>
        <SeasonAnalysisDashboard data={dashboardData} />
      </Suspense>
    </div>
  );
}
