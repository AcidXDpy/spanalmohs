import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/analytics/page-header";
import { StatsCommandWall } from "@/components/analytics/stats-command-wall";
import { PerformanceNarrative } from "@/components/analytics/performance-narrative";
import { buildSeasonAnalysisDashboardData } from "@/lib/stats/football-dashboard";
import { getAnalyticsDataset } from "@/lib/data/repository";
import {
  calculateTeamMetrics,
  getDriveResultDistribution,
  getGamePhaseTrendData,
  getGameTrendData,
  getOpponentScoutingRows,
  getPlayerImpactRows,
  getRosterCompositionRows,
  getSituationalEfficiency,
} from "@/lib/stats/football";

export default function StatsPage() {
  const dataset = getAnalyticsDataset();
  const metrics = calculateTeamMetrics(dataset);
  const trendData = getGameTrendData(dataset);
  const phaseData = getGamePhaseTrendData(dataset);
  const situationalRows = getSituationalEfficiency(dataset);
  const driveRows = getDriveResultDistribution(dataset);
  const playerRows = getPlayerImpactRows(dataset)
    .slice(0, 14)
    .map((row) => ({
      name: row.player.name,
      position: row.position,
      impactScore: row.impactScore,
      reliability: row.reliability,
      consistency: row.consistency,
      epa: row.epa,
      onOffSwing: row.onOffSwing,
      grade: row.grade,
    }));
  const opponentRows = getOpponentScoutingRows(dataset)
    .slice(0, 18)
    .map((row) => ({
      name: row.opponent.name,
      week: row.week,
      cluster: row.cluster,
      matchupScore: row.matchupScore,
      pressureStress: row.pressureStress,
      offensiveRisk: row.offensiveRisk,
    }));
  const rosterRows = getRosterCompositionRows(dataset).sort((left, right) => right.impact - left.impact);

  return (
    <div className="space-y-5">
      <PerformanceNarrative data={buildSeasonAnalysisDashboardData(dataset)} />
      <PageHeader
        eyebrow="Team Performance"
        title="Statistical Analysis"
        description="A dense football analytics snapshot built from team metrics, game trends, situational splits, player impact, opponent pressure, and roster composition."
        badge={`${metrics.length} Indicators / ${trendData.length} Games`}
        icon={BarChart3}
      />

      <StatsCommandWall
        metrics={metrics}
        trendData={trendData}
        phaseData={phaseData}
        situationalRows={situationalRows}
        driveRows={driveRows}
        playerRows={playerRows}
        opponentRows={opponentRows}
        rosterRows={rosterRows}
      />
    </div>
  );
}
