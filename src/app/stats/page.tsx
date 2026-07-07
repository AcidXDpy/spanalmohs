import { BarChart3 } from "lucide-react";

import { MetricCard } from "@/components/analytics/metric-card";
import { PageHeader } from "@/components/analytics/page-header";
import { AnalyticsLineChart } from "@/components/charts/analytics-line-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { calculateTeamMetrics, getGameTrendData, getSituationalEfficiency } from "@/lib/stats/football";

export default function StatsPage() {
  const dataset = getAnalyticsDataset();
  const metrics = calculateTeamMetrics(dataset);
  const trendData = getGameTrendData(dataset);
  const situationalRows = getSituationalEfficiency(dataset);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Advanced statistics engine"
        title="Metric formulas, confidence, comparisons, and football situation splits"
        description="Every displayed metric is calculated from the local football dataset and paired with reliability context so the output is useful without overstating certainty."
        badge={`${metrics.length} active metrics`}
        icon={BarChart3}
      />

      <Tabs defaultValue="core">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="core">Core metrics</TabsTrigger>
          <TabsTrigger value="advanced">Advanced modules</TabsTrigger>
          <TabsTrigger value="situational">Situational efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="core" className="space-y-4">
          <section className="grid gap-4 metric-grid">
            {metrics.slice(0, 8).map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </section>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <section className="grid gap-4 metric-grid">
            {metrics.slice(8).map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </section>
        </TabsContent>

        <TabsContent value="situational" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Game trend context</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsLineChart
                  data={trendData}
                  series={[
                    { key: "successRate", label: "Success rate" },
                    { key: "explosiveRate", label: "Explosive rate" },
                    { key: "offensiveEpa", label: "Offensive EPA" },
                  ]}
                  height={320}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Down, distance, quarter, and score state</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleDataTable
                  dense
                  rows={situationalRows.slice(0, 14)}
                  columns={[
                    { key: "segment", header: "Segment", cell: (row) => row.segment },
                    { key: "plays", header: "Plays", cell: (row) => row.plays },
                    { key: "success", header: "Success", cell: (row) => `${Math.round(row.successRate * 100)}%` },
                    { key: "epa", header: "EPA/play", cell: (row) => <span className="font-mono">{row.epaPerPlay}</span> },
                    { key: "reliability", header: "Reliability", cell: (row) => `${Math.round(row.reliability * 100)}%` },
                  ]}
                />
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
