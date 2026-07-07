import { Trophy } from "lucide-react";

import { PageHeader } from "@/components/analytics/page-header";
import { AnalyticsBarChart } from "@/components/charts/analytics-bar-chart";
import { AnalyticsLineChart } from "@/components/charts/analytics-line-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { getGameAnalysisRows, getGameTrendData, getPlayerImpactRows } from "@/lib/stats/football";

export default function GamesPage() {
  const dataset = getAnalyticsDataset();
  const trendData = getGameTrendData(dataset);
  const gameRows = getGameAnalysisRows(dataset);
  const driveRows = dataset.drives
    .filter((drive) => drive.offense === "mount-olive")
    .map((drive) => ({
      drive: `${drive.gameId.replace("game-0", "G")}-${drive.quarter}`,
      epa: drive.epa,
      yards: drive.yards,
    }));
  const playerImpact = getPlayerImpactRows(dataset).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Game analysis"
        title="Breakdowns, win probability, drive value, turning points, and postgame reports"
        description="Each game is decomposed into efficiency, possession quality, explosive plays, mistakes, player impact, and model-generated explanations."
        badge={`${dataset.games.length} games`}
        icon={Trophy}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Win probability and control</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsLineChart
              data={trendData}
              series={[
                { key: "winProbability", label: "Win probability" },
                { key: "gameControl", label: "Game control" },
              ]}
              height={300}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Drive EPA chart</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsBarChart data={driveRows} xKey="drive" yKey="epa" height={300} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Game-by-game analytical report</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleDataTable
            dense
            rows={gameRows}
            columns={[
              { key: "week", header: "Week", cell: (row) => row.game.week },
              { key: "opponent", header: "Opponent", cell: (row) => row.opponent },
              { key: "result", header: "Result", cell: (row) => <Badge variant="outline">{row.game.result}</Badge> },
              { key: "net", header: "Net EPA", cell: (row) => <span className="font-mono">{row.netEpa}</span> },
              { key: "drives", header: "Drive eff.", cell: (row) => `${Math.round(row.driveEfficiency * 100)}%` },
              { key: "turning", header: "Turning point", cell: (row) => row.turningPoint },
              { key: "explanation", header: "Model explanation", cell: (row) => row.modelExplanation },
            ]}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Player impact by game sample</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={playerImpact}
              columns={[
                { key: "player", header: "Player", cell: (row) => row.player.name },
                { key: "impact", header: "Impact", cell: (row) => row.impactScore },
                { key: "epa", header: "EPA", cell: (row) => row.epa },
                { key: "onoff", header: "On/off", cell: (row) => row.onOffSwing },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mistakes and missed opportunities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {gameRows.map((row) => (
              <div key={row.game.id} className="rounded-lg border bg-background p-3 text-sm leading-6">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">Week {row.game.week} vs {row.opponent}</span>
                  <Badge variant="outline">{row.game.scoreFor}-{row.game.scoreAgainst}</Badge>
                </div>
                <p className="text-muted-foreground">{row.missedOpportunity}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
