import { Users } from "lucide-react";

import { PageHeader } from "@/components/analytics/page-header";
import { AnalyticsLineChart } from "@/components/charts/analytics-line-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { statusLabel } from "@/lib/format";
import { getPlayerImpactRows, getPlayerTrend } from "@/lib/stats/football";

export default function PlayersPage() {
  const dataset = getAnalyticsDataset();
  const playerRows = getPlayerImpactRows(dataset);
  const featured = playerRows.slice(0, 4);
  const topPlayer = playerRows[0]!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Player Intelligence"
        title="Profiles, Trends, Impact, Reliability, and Coach-Facing Recommendations"
        description="Player evaluation combines usage, EPA contribution, assignment grade, disruption, availability risk, and week-to-week consistency."
        badge={`${dataset.players.length} Rostered Players`}
        icon={Users}
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Impact Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={playerRows}
              columns={[
                { key: "player", header: "Player", cell: (row) => row.player.name },
                { key: "position", header: "Pos", cell: (row) => row.position },
                { key: "usage", header: "Usage", cell: (row) => row.usage },
                { key: "impact", header: "Impact", cell: (row) => <span className="font-mono">{row.impactScore}</span> },
                { key: "reliability", header: "Reliability", cell: (row) => <span className="font-mono">{row.reliability}</span> },
                { key: "consistency", header: "Consistency", cell: (row) => <span className="font-mono">{row.consistency}</span> },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{topPlayer.player.name} Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsLineChart
              data={getPlayerTrend(dataset, topPlayer.player.id)}
              series={[
                { key: "epa", label: "EPA Contribution" },
                { key: "grade", label: "Assignment Grade" },
                { key: "snaps", label: "Snaps" },
              ]}
              height={320}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {featured.map((row) => (
          <Card key={row.player.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{row.player.name}</CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground">
                    #{row.player.number} / {row.player.position} / {row.player.classYear}
                  </div>
                </div>
                <Badge variant="outline">{statusLabel(row.player.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Impact</div>
                  <div className="font-mono text-xl">{row.impactScore}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Reliability</div>
                  <div className="font-mono text-xl">{row.reliability}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">On/off EPA</div>
                  <div className="font-mono text-xl">{row.onOffSwing}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>
                  <span className="text-foreground">Similar Archetype:</span> {row.player.archetype}
                </p>
                <p>
                  <span className="text-foreground">Strength:</span>{" "}
                  {row.impactScore > 80
                    ? "Creates high-value outcomes in leverage situations."
                    : "Provides context-specific value when usage is controlled."}
                </p>
                <p>
                  <span className="text-foreground">Development Focus:</span>{" "}
                  {row.reliability < 75
                    ? "Reduce volatility and protect availability risk."
                    : "Expand role while preserving repeatable efficiency."}
                </p>
                <p>
                  <span className="text-foreground">Coach Summary:</span> {row.recommendation}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
