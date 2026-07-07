import { Radar } from "lucide-react";

import { InsightPanel } from "@/components/analytics/insight-panel";
import { PageHeader } from "@/components/analytics/page-header";
import { AnalyticsScatterChart } from "@/components/charts/analytics-scatter-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { getOpponentScoutingRows } from "@/lib/stats/football";

export default function OpponentsPage() {
  const dataset = getAnalyticsDataset();
  const rows = getOpponentScoutingRows(dataset);
  const highestRisk = rows.slice().sort((a, b) => b.pressureStress - a.pressureStress)[0]!;
  const scatterRows = rows.map((row) => ({
    opponent: row.opponent.name,
    pressure: row.opponent.defensivePressure,
    pace: row.opponent.offensivePace,
    strength: row.opponent.strengthRating * 100,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opponent scouting"
        title="Tendencies, style clusters, matchup analysis, and scouting reports"
        description="Opponent profiles combine pace, defensive pressure, strength rating, known tendencies, and Mount Olive's game-level performance against similar styles."
        badge={`${rows.length} opponent profiles`}
        icon={Radar}
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Opponent style map</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsScatterChart data={scatterRows} xKey="pressure" yKey="pace" zKey="strength" height={320} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scouting matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={rows}
              columns={[
                { key: "opponent", header: "Opponent", cell: (row) => row.opponent.name },
                { key: "cluster", header: "Cluster", cell: (row) => <Badge variant="outline">{row.cluster}</Badge> },
                { key: "matchup", header: "Matchup", cell: (row) => <span className="font-mono">{row.matchupScore}</span> },
                { key: "risk", header: "Risk", cell: (row) => row.opponent.riskProfile },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <InsightPanel
        title="Model-generated scouting report"
        insights={[
          {
            label: "Highest-risk opponent",
            tone: "risk",
            confidence: 0.69,
            body: `${highestRisk.opponent.name} combines pressure and strength at the top of the sample. The matchup needs quick answers, protection rules, and lower-risk early-down calls.`,
          },
          {
            label: "Style classification",
            tone: "signal",
            confidence: 0.64,
            body: "The opponent set separates into tempo spread, pressure-control, possession leverage, and balanced baseline profiles. Those clusters should drive weekly scout-card templates.",
          },
          {
            label: "Recommended strategy",
            tone: "opportunity",
            confidence: 0.62,
            body: highestRisk.recommendation,
          },
          {
            label: "Limitation",
            tone: "note",
            confidence: 0.58,
            body: "Opponent clusters are useful for scouting organization, not proof of causation. Film grades and real play-by-play imports should refine these groupings.",
          },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {rows.slice(0, 6).map((row) => (
          <Card key={row.opponent.id}>
            <CardHeader>
              <CardTitle>{row.opponent.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{row.opponent.record}</Badge>
                <Badge variant="outline">{row.cluster}</Badge>
              </div>
              <p>
                <span className="text-foreground">Tendency:</span> {row.opponent.style}
              </p>
              <p>
                <span className="text-foreground">Strength:</span>{" "}
                {row.opponent.strengthRating > 0.65
                  ? "High strength rating and strong pressure profile."
                  : "Manageable profile if Mount Olive wins early downs."}
              </p>
              <p>
                <span className="text-foreground">Weakness:</span>{" "}
                {row.opponent.defensivePressure > 65
                  ? "Aggression can be punished by screens, motion, and protection checks."
                  : "Pressure profile is less disruptive than the stronger opponents in sample."}
              </p>
              <p>
                <span className="text-foreground">Strategy:</span> {row.recommendation}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
