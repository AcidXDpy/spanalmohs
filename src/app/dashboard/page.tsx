import { Gauge } from "lucide-react";

import { InsightPanel } from "@/components/analytics/insight-panel";
import { MetricCard } from "@/components/analytics/metric-card";
import { PageHeader } from "@/components/analytics/page-header";
import { AnalyticsLineChart } from "@/components/charts/analytics-line-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { titleCase } from "@/lib/format";
import {
  calculateTeamMetrics,
  getGameTrendData,
  getOpponentScoutingRows,
  getPlayerImpactRows,
} from "@/lib/stats/football";

export default function DashboardPage() {
  const dataset = getAnalyticsDataset();
  const metrics = calculateTeamMetrics(dataset);
  const trendData = getGameTrendData(dataset);
  const playerRows = getPlayerImpactRows(dataset);
  const opponentRows = getOpponentScoutingRows(dataset);
  const featuredMetrics = ["epa", "success-rate", "drive-efficiency", "game-control"].map(
    (key) => metrics.find((metric) => metric.key === key)!
  );

  const topRisk = opponentRows.slice().sort((a, b) => b.pressureStress - a.pressureStress)[0]!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Center Dashboard"
        title="Team Performance and Decision-Support Overview"
        description="Centralized football analytics for performance tracking, opponent scouting, player evaluation, machine-learning signals, and coach-facing recommendations."
        badge="Sample/Demo Data"
        icon={Gauge}
      />

      <section className="grid gap-4 metric-grid">
        {featuredMetrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} compact />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Game-by-Game Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsLineChart
              data={trendData}
              series={[
                { key: "netEfficiency", label: "Net EPA" },
                { key: "gameControl", label: "Game Control" },
                { key: "winProbability", label: "Win Probability" },
              ]}
              height={310}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Player Impact Leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={playerRows.slice(0, 6)}
              columns={[
                { key: "player", header: "Player", cell: (row) => row.player.name },
                { key: "position", header: "Pos", cell: (row) => row.position },
                { key: "impact", header: "Impact", cell: (row) => <span className="font-mono">{row.impactScore}</span> },
                { key: "reliability", header: "Reliability", cell: (row) => <span className="font-mono">{row.reliability}</span> },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <InsightPanel
        title="Analytical Signals"
        insights={[
          {
            label: "Primary Opportunity",
            tone: "opportunity",
            confidence: 0.72,
            body: "Drive efficiency is stronger than raw yardage suggests. Mount Olive is converting possessions into points when first-down success stays above the sample baseline.",
          },
          {
            label: "Primary Risk",
            tone: "risk",
            confidence: 0.68,
            body: `${topRisk.opponent.name} creates the highest pressure-stress profile. Protection answers and quick-game constraint tags should be prepared before long-yardage downs.`,
          },
          {
            label: "Performance Shift",
            tone: "signal",
            confidence: 0.61,
            body: "The last three games show higher schedule strength and higher defensive EPA allowed. Opponent adjustment keeps the offense near positive, but volatility has increased.",
          },
          {
            label: "Data Credibility",
            tone: "note",
            confidence: 0.58,
            body: "The platform is using a realistic demo dataset with fewer than 200 offensive plays. Models are exploratory until real season CSVs expand the sample.",
          },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Efficiency Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["red-zone-efficiency", "third-down-efficiency", "explosive-rate"].map((key) => {
              const metric = metrics.find((item) => item.key === key)!;

              return (
                <div key={metric.key} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{metric.name}</div>
                    <div className="text-xs text-muted-foreground">{metric.explanation}</div>
                  </div>
                  <span className="font-mono text-sm">{metric.formattedValue}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Opponent Risk Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={opponentRows.slice().sort((a, b) => b.pressureStress - a.pressureStress).slice(0, 4)}
              columns={[
                { key: "opponent", header: "Opponent", cell: (row) => row.opponent.name },
                { key: "cluster", header: "Style", cell: (row) => <Badge variant="outline">{titleCase(row.cluster)}</Badge> },
                { key: "pressure", header: "Pressure", cell: (row) => <span className="font-mono">{row.pressureStress}</span> },
                { key: "recommendation", header: "Recommendation", cell: (row) => row.recommendation },
              ]}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
