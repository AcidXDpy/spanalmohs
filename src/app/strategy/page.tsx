import { Workflow } from "lucide-react";

import { PageHeader } from "@/components/analytics/page-header";
import { AnalyticsBarChart } from "@/components/charts/analytics-bar-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { titleCase } from "@/lib/format";
import { round } from "@/lib/math";
import {
  calculateTeamMetrics,
  getOpponentScoutingRows,
  getPlayerImpactRows,
  getStrategyRecommendations,
} from "@/lib/stats/football";

function deterministicMonteCarlo(baseProbability: number, volatility: number) {
  const scenarios = Array.from({ length: 500 }, (_, index) => {
    const turnoverShock = Math.sin(index * 3.17) * 0.08;
    const fieldPositionShock = Math.cos(index * 1.91) * 0.05;
    const pressureShock = Math.sin(index * 0.73) * volatility * 0.006;
    const probability = Math.min(0.96, Math.max(0.04, baseProbability + turnoverShock + fieldPositionShock - pressureShock));
    return probability;
  });
  const wins = scenarios.filter((probability, index) => ((index * 37) % 100) / 100 < probability).length;

  return {
    winProbability: wins / scenarios.length,
    p25: scenarios.slice().sort((a, b) => a - b)[Math.floor(scenarios.length * 0.25)]!,
    p75: scenarios.slice().sort((a, b) => a - b)[Math.floor(scenarios.length * 0.75)]!,
  };
}

export default function StrategyPage() {
  const dataset = getAnalyticsDataset();
  const metrics = calculateTeamMetrics(dataset);
  const recommendations = getStrategyRecommendations(dataset);
  const playerRows = getPlayerImpactRows(dataset);
  const opponentRows = getOpponentScoutingRows(dataset);
  const baseProbability = dataset.games.reduce((total, game) => total + game.winProbabilityStart, 0) / dataset.games.length;
  const volatility = metrics.find((metric) => metric.key === "volatility-score")?.value ?? 4;
  const simulation = deterministicMonteCarlo(baseProbability, volatility);
  const personnelRows = playerRows.slice(0, 6).map((row) => ({
    player: row.player.name,
    role: row.position,
    value: row.reliability + row.impactScore * 0.35,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Strategy Console"
        title="Coach-Facing Decision Support for Leverage, Personnel, and Matchup Planning"
        description="This console converts team metrics, opponent profiles, and player reliability into practical strategy recommendations."
        badge={`${Math.round(simulation.winProbability * 100)}% Simulated Baseline`}
        icon={Workflow}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {recommendations.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm">{titleCase(item.title)}</CardTitle>
                <Badge variant="outline">{Math.round(item.confidence * 100)}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <p className="text-foreground">{item.signal}</p>
              <p className="text-muted-foreground">{item.rationale}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Personnel Optimization Concept</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsBarChart data={personnelRows} xKey="player" yKey="value" height={300} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opponent Weakness Finder</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={opponentRows}
              columns={[
                { key: "opponent", header: "Opponent", cell: (row) => row.opponent.name },
                { key: "cluster", header: "Cluster", cell: (row) => <Badge variant="outline">{titleCase(row.cluster)}</Badge> },
                { key: "weakness", header: "Attack Point", cell: (row) => row.recommendation },
                { key: "risk", header: "Risk", cell: (row) => row.opponent.riskProfile },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Simulator</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Monte Carlo Win Probability</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{round(simulation.winProbability * 100, 1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">25th Percentile Script</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{round(simulation.p25 * 100, 1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">75th Percentile Script</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{round(simulation.p75 * 100, 1)}%</div>
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            Simulation uses current win-probability priors, observed volatility, field-position shock, and turnover shock. It is directional until real opponent-specific data is imported.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
