import type { AnalyticsDataset, DriveResult, PlayType } from "@/types";
import { clamp, confidenceFromSampleSize, formatSigned, mean, median, percent, ratio, round, sum } from "@/lib/math";

export type DashboardMetricKey =
  | "epaPerPlay"
  | "successRate"
  | "explosiveRate"
  | "pointsPerDrive"
  | "scoringDriveRate"
  | "turnoverRate"
  | "redZoneSuccessRate"
  | "thirdDownSuccessRate"
  | "earlyDownSuccessRate"
  | "medianPlayEpa";

type Direction = "higher" | "lower" | "neutral";

export type DashboardSelectOption = {
  value: string;
  label: string;
  meta?: string;
};

export type DashboardGameRow = {
  id: string;
  week: number;
  label: string;
  opponentId: string;
  opponent: string;
  date: string;
  result: string;
  score: string;
  scoreMargin: number;
  plays: number;
  offensiveEpa: number;
  defensiveEpaAllowed: number;
  epaPerPlay: number;
  successRate: number;
  explosiveRate: number;
  driveEfficiency: number;
  pointsPerDrive: number;
  thirdDownRate: number;
  redZoneRate: number;
  turnoverRate: number;
  gameControl: number;
};

export type DashboardPlayRow = {
  id: string;
  gameId: string;
  driveId: string;
  week: number;
  opponentId: string;
  opponent: string;
  quarter: number;
  down: 1 | 2 | 3 | 4;
  distance: number;
  distanceBucket: "short" | "medium" | "long";
  yardLine: number;
  fieldPosition: string;
  fieldZone: "backed-up" | "own-territory" | "midfield" | "plus-territory" | "red-zone";
  fieldZoneLabel: string;
  playType: PlayType;
  playTypeLabel: string;
  yardsGained: number;
  epa: number;
  success: boolean;
  explosive: boolean;
  turnover: boolean;
  redZone: boolean;
  playerId?: string;
  playerName: string;
  scoreDiff: number;
  scoreState: "leading" | "tied" | "trailing";
};

export type DashboardDriveRow = {
  id: string;
  gameId: string;
  week: number;
  opponentId: string;
  opponent: string;
  quarter: number;
  startYardLine: number;
  endYardLine: number;
  startFieldPosition: string;
  endFieldPosition: string;
  playCount: number;
  yards: number;
  result: DriveResult;
  resultLabel: string;
  points: number;
  epa: number;
  epaPerPlay: number;
  startScoreDiff: number;
  scoringDrive: boolean;
  turnoverDrive: boolean;
};

export type DashboardSelectionSummary = {
  plays: number;
  drives: number;
  epaPerPlay: number;
  successRate: number;
  explosiveRate: number;
  pointsPerDrive: number;
  scoringDriveRate: number;
  turnoverRate: number;
  redZoneSuccessRate: number;
  thirdDownSuccessRate: number;
  earlyDownSuccessRate: number;
  medianPlayEpa: number;
  negativePlayRate: number;
  redZonePlays: number;
  thirdDownPlays: number;
  earlyDownPlays: number;
};

export type DashboardMetricSummary = {
  key: DashboardMetricKey;
  label: string;
  description: string;
  value: number;
  formattedValue: string;
  baseline: number;
  baselineLabel: string;
  sampleSize: number;
  confidence: number;
  trend: Array<{
    gameId: string;
    week: string;
    opponent: string;
    value: number;
  }>;
  change: number;
  direction: Direction;
  status: "positive" | "negative" | "neutral";
};

export type SituationCell = {
  id: string;
  down: 1 | 2 | 3 | 4;
  downLabel: string;
  distanceBucket: "short" | "medium" | "long";
  distanceLabel: string;
  plays: number;
  successRate: number;
  epaPerPlay: number;
  explosiveRate: number;
  reliability: number;
};

export type FieldSegment = {
  id: string;
  start: number;
  end: number;
  label: string;
  plays: number;
  successRate: number;
  epaPerPlay: number;
  explosiveRate: number;
  runRate: number;
  passRate: number;
  turnoverRate: number;
};

export type SustainabilitySummary = {
  totalEpa: number;
  epaPerPlay: number;
  epaPerPlayWithoutTopTenPercent: number;
  topTenPercentShareOfPositiveEpa: number;
  medianEpa: number;
  negativePlayRate: number;
  earlyDownEpa: number;
  lateDownEpa: number;
};

export type KeyFinding = {
  label: string;
  value: string;
  body: string;
  status: "positive" | "negative" | "neutral" | "note";
};

export type SeasonAnalysisDashboardData = {
  team: {
    name: string;
    season: string;
    classification: string;
    isDemoData: boolean;
  };
  generatedAt: string;
  filters: {
    games: DashboardSelectOption[];
    opponents: DashboardSelectOption[];
    quarters: DashboardSelectOption[];
    downs: DashboardSelectOption[];
    playTypes: DashboardSelectOption[];
    redZone: DashboardSelectOption[];
  };
  summary: {
    games: number;
    wins: number;
    losses: number;
    plays: number;
    drives: number;
    players: number;
  };
  games: DashboardGameRow[];
  plays: DashboardPlayRow[];
  drives: DashboardDriveRow[];
  methodologyNotes: string[];
};

type MetricDefinition = {
  key: DashboardMetricKey;
  label: string;
  description: string;
  baseline: number;
  baselineLabel: string;
  direction: Direction;
  sampleKind: "plays" | "drives" | "redZonePlays" | "thirdDownPlays" | "earlyDownPlays";
  idealSampleSize: number;
  read: (summary: DashboardSelectionSummary) => number;
  format: (value: number) => string;
};

const metricDefinitions: MetricDefinition[] = [
  {
    key: "epaPerPlay",
    label: "EPA per Play",
    description: "Average play value from down, distance, field position, and outcome.",
    baseline: 0.02,
    baselineLabel: "0.020 Baseline",
    direction: "higher",
    sampleKind: "plays",
    idealSampleSize: 450,
    read: (summary) => summary.epaPerPlay,
    format: (value) => `${formatSigned(value, 3)} EPA`,
  },
  {
    key: "successRate",
    label: "Success Rate",
    description: "Share of offensive plays that keep the offense on schedule.",
    baseline: 0.42,
    baselineLabel: "42% Baseline",
    direction: "higher",
    sampleKind: "plays",
    idealSampleSize: 450,
    read: (summary) => summary.successRate,
    format: percent,
  },
  {
    key: "explosiveRate",
    label: "Explosive Play Rate",
    description: "Share of plays marked as explosive in the play-by-play dataset.",
    baseline: 0.08,
    baselineLabel: "8% Baseline",
    direction: "higher",
    sampleKind: "plays",
    idealSampleSize: 450,
    read: (summary) => summary.explosiveRate,
    format: percent,
  },
  {
    key: "pointsPerDrive",
    label: "Points per Drive",
    description: "Observed scoring value per offensive possession.",
    baseline: 1.9,
    baselineLabel: "1.9 Baseline",
    direction: "higher",
    sampleKind: "drives",
    idealSampleSize: 80,
    read: (summary) => summary.pointsPerDrive,
    format: (value) => `${round(value, 2)} pts`,
  },
  {
    key: "scoringDriveRate",
    label: "Scoring Drive Rate",
    description: "Share of offensive drives ending in a touchdown or field goal.",
    baseline: 0.36,
    baselineLabel: "36% Baseline",
    direction: "higher",
    sampleKind: "drives",
    idealSampleSize: 80,
    read: (summary) => summary.scoringDriveRate,
    format: percent,
  },
  {
    key: "turnoverRate",
    label: "Turnover Rate",
    description: "Share of offensive plays ending in a turnover.",
    baseline: 0.025,
    baselineLabel: "2.5% Baseline",
    direction: "lower",
    sampleKind: "plays",
    idealSampleSize: 450,
    read: (summary) => summary.turnoverRate,
    format: percent,
  },
  {
    key: "redZoneSuccessRate",
    label: "Red Zone Play Success",
    description: "Success rate on plays snapped in the red zone.",
    baseline: 0.5,
    baselineLabel: "50% Baseline",
    direction: "higher",
    sampleKind: "redZonePlays",
    idealSampleSize: 90,
    read: (summary) => summary.redZoneSuccessRate,
    format: percent,
  },
  {
    key: "thirdDownSuccessRate",
    label: "Third-Down Success",
    description: "Success rate on third-down plays in the selected sample.",
    baseline: 0.39,
    baselineLabel: "39% Baseline",
    direction: "higher",
    sampleKind: "thirdDownPlays",
    idealSampleSize: 120,
    read: (summary) => summary.thirdDownSuccessRate,
    format: percent,
  },
  {
    key: "earlyDownSuccessRate",
    label: "Early-Down Success",
    description: "Success rate on first and second down.",
    baseline: 0.44,
    baselineLabel: "44% Baseline",
    direction: "higher",
    sampleKind: "earlyDownPlays",
    idealSampleSize: 300,
    read: (summary) => summary.earlyDownSuccessRate,
    format: percent,
  },
  {
    key: "medianPlayEpa",
    label: "Median Play EPA",
    description: "Middle play value after sorting all selected plays by EPA.",
    baseline: 0,
    baselineLabel: "0.000 Neutral",
    direction: "higher",
    sampleKind: "plays",
    idealSampleSize: 450,
    read: (summary) => summary.medianPlayEpa,
    format: (value) => `${formatSigned(value, 3)} EPA`,
  },
];

const playTypeOrder: PlayType[] = ["run", "pass", "screen", "punt", "field-goal", "penalty"];

function indexBy<T, K extends string | number>(items: T[], keyFor: (item: T) => K) {
  const index = new Map<K, T>();

  for (const item of items) {
    index.set(keyFor(item), item);
  }

  return index;
}

function groupBy<T, K extends string | number>(items: T[], keyFor: (item: T) => K) {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key);

    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function downLabel(down: 1 | 2 | 3 | 4) {
  return down === 1 ? "1st Down" : down === 2 ? "2nd Down" : down === 3 ? "3rd Down" : "4th Down";
}

function drivePoints(result: DriveResult) {
  if (result === "touchdown") {
    return 7;
  }

  if (result === "field-goal") {
    return 3;
  }

  return 0;
}

function distanceBucket(distance: number): DashboardPlayRow["distanceBucket"] {
  if (distance <= 3) {
    return "short";
  }

  if (distance <= 7) {
    return "medium";
  }

  return "long";
}

function fieldZone(yardLine: number): Pick<DashboardPlayRow, "fieldZone" | "fieldZoneLabel"> {
  if (yardLine <= 20) {
    return { fieldZone: "backed-up", fieldZoneLabel: "Backed Up" };
  }

  if (yardLine < 50) {
    return { fieldZone: "own-territory", fieldZoneLabel: "Own Territory" };
  }

  if (yardLine <= 60) {
    return { fieldZone: "midfield", fieldZoneLabel: "Midfield" };
  }

  if (yardLine < 80) {
    return { fieldZone: "plus-territory", fieldZoneLabel: "Plus Territory" };
  }

  return { fieldZone: "red-zone", fieldZoneLabel: "Red Zone" };
}

function fieldPositionLabel(yardLine: number) {
  if (yardLine === 50) {
    return "50";
  }

  if (yardLine < 50) {
    return `Own ${Math.max(1, yardLine)}`;
  }

  return `Opp ${Math.max(1, 100 - yardLine)}`;
}

function scoreState(scoreDiff: number): DashboardPlayRow["scoreState"] {
  if (scoreDiff > 0) {
    return "leading";
  }

  if (scoreDiff < 0) {
    return "trailing";
  }

  return "tied";
}

function sampleSizeForMetric(metric: MetricDefinition, summary: DashboardSelectionSummary) {
  return summary[metric.sampleKind];
}

function confidenceForSample(sampleSize: number, idealSampleSize: number) {
  if (sampleSize <= 0) {
    return 0;
  }

  return round(confidenceFromSampleSize(sampleSize, idealSampleSize), 2);
}

function statusForMetric(value: number, baseline: number, direction: Direction): DashboardMetricSummary["status"] {
  const threshold = Math.max(Math.abs(baseline) * 0.08, direction === "lower" ? 0.004 : 0.01);

  if (direction === "neutral" || Math.abs(value - baseline) <= threshold) {
    return "neutral";
  }

  if (direction === "lower") {
    return value < baseline ? "positive" : "negative";
  }

  return value > baseline ? "positive" : "negative";
}

function changeForTrend(values: number[]) {
  if (values.length < 4) {
    return 0;
  }

  const current = values.slice(Math.max(0, values.length - 6));
  const previous = values.slice(Math.max(0, values.length - 12), Math.max(0, values.length - 6));

  if (previous.length === 0) {
    return 0;
  }

  return round(mean(current) - mean(previous), 3);
}

export function summarizeFootballSelection(
  plays: DashboardPlayRow[],
  drives: DashboardDriveRow[]
): DashboardSelectionSummary {
  const redZonePlays = plays.filter((play) => play.redZone);
  const thirdDownPlays = plays.filter((play) => play.down === 3);
  const earlyDownPlays = plays.filter((play) => play.down === 1 || play.down === 2);

  return {
    plays: plays.length,
    drives: drives.length,
    epaPerPlay: round(mean(plays.map((play) => play.epa)), 3),
    successRate: round(ratio(plays.filter((play) => play.success).length, plays.length), 3),
    explosiveRate: round(ratio(plays.filter((play) => play.explosive).length, plays.length), 3),
    pointsPerDrive: round(ratio(sum(drives.map((drive) => drive.points)), drives.length), 2),
    scoringDriveRate: round(ratio(drives.filter((drive) => drive.scoringDrive).length, drives.length), 3),
    turnoverRate: round(ratio(plays.filter((play) => play.turnover).length, plays.length), 3),
    redZoneSuccessRate: round(ratio(redZonePlays.filter((play) => play.success).length, redZonePlays.length), 3),
    thirdDownSuccessRate: round(ratio(thirdDownPlays.filter((play) => play.success).length, thirdDownPlays.length), 3),
    earlyDownSuccessRate: round(ratio(earlyDownPlays.filter((play) => play.success).length, earlyDownPlays.length), 3),
    medianPlayEpa: round(median(plays.map((play) => play.epa)), 3),
    negativePlayRate: round(ratio(plays.filter((play) => play.epa < 0).length, plays.length), 3),
    redZonePlays: redZonePlays.length,
    thirdDownPlays: thirdDownPlays.length,
    earlyDownPlays: earlyDownPlays.length,
  };
}

export function getDashboardMetricDefinitions() {
  return metricDefinitions.map(({ key, label, description, baseline, baselineLabel, direction }) => ({
    key,
    label,
    description,
    baseline,
    baselineLabel,
    direction,
  }));
}

export function buildMetricSummaries(
  plays: DashboardPlayRow[],
  drives: DashboardDriveRow[],
  games: DashboardGameRow[]
): DashboardMetricSummary[] {
  const summary = summarizeFootballSelection(plays, drives);

  return metricDefinitions.map((definition) => {
    const trend = games
      .map((game) => {
        const gamePlays = plays.filter((play) => play.gameId === game.id);
        const gameDrives = drives.filter((drive) => drive.gameId === game.id);
        const gameSummary = summarizeFootballSelection(gamePlays, gameDrives);
        const sampleSize = sampleSizeForMetric(definition, gameSummary);

        if (sampleSize === 0) {
          return null;
        }

        return {
          gameId: game.id,
          week: `W${game.week}`,
          opponent: game.opponent,
          value: round(definition.read(gameSummary), 3),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const sampleSize = sampleSizeForMetric(definition, summary);
    const value = round(definition.read(summary), definition.key === "pointsPerDrive" ? 2 : 3);

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      value,
      formattedValue: definition.format(value),
      baseline: definition.baseline,
      baselineLabel: definition.baselineLabel,
      sampleSize,
      confidence: confidenceForSample(sampleSize, definition.idealSampleSize),
      trend,
      change: changeForTrend(trend.map((row) => row.value)),
      direction: definition.direction,
      status: statusForMetric(value, definition.baseline, definition.direction),
    };
  });
}

export function buildSituationMatrix(plays: DashboardPlayRow[]): SituationCell[] {
  const buckets = [
    { key: "short", label: "Short", read: (play: DashboardPlayRow) => play.distanceBucket === "short" },
    { key: "medium", label: "Medium", read: (play: DashboardPlayRow) => play.distanceBucket === "medium" },
    { key: "long", label: "Long", read: (play: DashboardPlayRow) => play.distanceBucket === "long" },
  ] as const;

  return ([1, 2, 3, 4] as const).flatMap((down) =>
    buckets.map((bucket) => {
      const matching = plays.filter((play) => play.down === down && bucket.read(play));

      return {
        id: `${down}-${bucket.key}`,
        down,
        downLabel: downLabel(down),
        distanceBucket: bucket.key,
        distanceLabel: bucket.label,
        plays: matching.length,
        successRate: round(ratio(matching.filter((play) => play.success).length, matching.length), 3),
        epaPerPlay: round(mean(matching.map((play) => play.epa)), 3),
        explosiveRate: round(ratio(matching.filter((play) => play.explosive).length, matching.length), 3),
        reliability: confidenceForSample(matching.length, 35),
      };
    })
  );
}

export function buildFieldSegments(plays: DashboardPlayRow[]): FieldSegment[] {
  return Array.from({ length: 10 }, (_, index) => {
    const start = index * 10;
    const end = start + 10;
    const matching = plays.filter((play) => {
      const yardLine = clamp(play.yardLine, 0, 99.9);
      return yardLine >= start && yardLine < end;
    });
    const passPlays = matching.filter((play) => play.playType === "pass" || play.playType === "screen");

    return {
      id: `${start}-${end}`,
      start,
      end,
      label: start < 50 ? `Own ${start}-${end}` : start === 50 ? "Midfield" : `Opp ${100 - end}-${100 - start}`,
      plays: matching.length,
      successRate: round(ratio(matching.filter((play) => play.success).length, matching.length), 3),
      epaPerPlay: round(mean(matching.map((play) => play.epa)), 3),
      explosiveRate: round(ratio(matching.filter((play) => play.explosive).length, matching.length), 3),
      runRate: round(ratio(matching.filter((play) => play.playType === "run").length, matching.length), 3),
      passRate: round(ratio(passPlays.length, matching.length), 3),
      turnoverRate: round(ratio(matching.filter((play) => play.turnover).length, matching.length), 3),
    };
  });
}

export function buildSustainability(plays: DashboardPlayRow[]): SustainabilitySummary {
  const totalEpa = sum(plays.map((play) => play.epa));
  const positiveEpa = sum(plays.filter((play) => play.epa > 0).map((play) => play.epa));
  const topCount = Math.max(1, Math.ceil(plays.length * 0.1));
  const topEpa = sum(
    plays
      .slice()
      .sort((left, right) => right.epa - left.epa)
      .slice(0, topCount)
      .map((play) => play.epa)
  );
  const withoutTop = plays
    .slice()
    .sort((left, right) => right.epa - left.epa)
    .slice(topCount);
  const earlyDownPlays = plays.filter((play) => play.down === 1 || play.down === 2);
  const lateDownPlays = plays.filter((play) => play.down === 3 || play.down === 4);

  return {
    totalEpa: round(totalEpa, 2),
    epaPerPlay: round(mean(plays.map((play) => play.epa)), 3),
    epaPerPlayWithoutTopTenPercent: round(mean(withoutTop.map((play) => play.epa)), 3),
    topTenPercentShareOfPositiveEpa: round(ratio(topEpa, Math.max(positiveEpa, 0.001)), 3),
    medianEpa: round(median(plays.map((play) => play.epa)), 3),
    negativePlayRate: round(ratio(plays.filter((play) => play.epa < 0).length, plays.length), 3),
    earlyDownEpa: round(mean(earlyDownPlays.map((play) => play.epa)), 3),
    lateDownEpa: round(mean(lateDownPlays.map((play) => play.epa)), 3),
  };
}

export function buildKeyFindings(plays: DashboardPlayRow[], drives: DashboardDriveRow[]): KeyFinding[] {
  const summary = summarizeFootballSelection(plays, drives);
  const sustainability = buildSustainability(plays);
  const thirdDownStatus =
    summary.thirdDownPlays < 12 ? "note" : summary.thirdDownSuccessRate >= 0.39 ? "positive" : "negative";
  const explosiveStatus = summary.explosiveRate >= 0.08 ? "positive" : "neutral";

  return [
    {
      label: "Down-To-Down Efficiency",
      value: percent(summary.successRate),
      status: summary.successRate >= 0.42 ? "positive" : "negative",
      body:
        summary.successRate >= 0.42
          ? `The selected sample is above the 42% success baseline across ${summary.plays} plays.`
          : `The selected sample is below the 42% success baseline across ${summary.plays} plays.`,
    },
    {
      label: "Explosive Play Dependence",
      value: percent(sustainability.topTenPercentShareOfPositiveEpa),
      status: explosiveStatus,
      body: `The top 10% of plays account for this share of positive EPA, so the view separates ceiling from repeatable baseline production.`,
    },
    {
      label: "Possession Conversion",
      value: `${round(summary.pointsPerDrive, 2)} Points`,
      status: summary.scoringDriveRate >= 0.36 ? "positive" : "negative",
      body: `${drives.length} offensive drives produce a ${percent(summary.scoringDriveRate)} scoring-drive rate.`,
    },
    {
      label: "Third-Down Sample",
      value: percent(summary.thirdDownSuccessRate),
      status: thirdDownStatus,
      body:
        summary.thirdDownPlays < 12
          ? `Only ${summary.thirdDownPlays} third-down plays are in the selected view, so this split should be treated as directional.`
          : `${summary.thirdDownPlays} third-down plays are available in the selected view.`,
    },
    {
      label: "Data Boundary",
      value: `${summary.plays} Plays`,
      status: "note",
      body: "This page uses observed play, drive, game, player, and opponent fields only. Player-tracking coordinates and counterfactual play-call models are not present in the current dataset.",
    },
  ];
}

export function buildSeasonAnalysisDashboardData(dataset: AnalyticsDataset): SeasonAnalysisDashboardData {
  const opponentsById = indexBy(dataset.opponents, (opponent) => opponent.id);
  const gamesById = indexBy(dataset.games, (game) => game.id);
  const playersById = indexBy(dataset.players, (player) => player.id);
  const statsByGameId = indexBy(dataset.teamGameStats, (stat) => stat.gameId);
  const offensiveDrives = dataset.drives.filter((drive) => drive.offense === "mount-olive");
  const offensivePlays = dataset.plays.filter((play) => play.offense === "mount-olive");
  const drivesByGameId = groupBy(offensiveDrives, (drive) => drive.gameId);

  const games = dataset.games.map((game) => {
    const opponent = opponentsById.get(game.opponentId);
    const stat = statsByGameId.get(game.id);
    const gameDrives = drivesByGameId.get(game.id) ?? [];
    const scoringDrives = gameDrives.filter((drive) => drivePoints(drive.result) > 0);
    const strength = opponent?.strengthRating ?? 0.5;
    const netEfficiency = (stat?.offensiveEpa ?? 0) - (stat?.defensiveEpaAllowed ?? 0);
    const drivePointsTotal = sum(gameDrives.map((drive) => drivePoints(drive.result)));

    return {
      id: game.id,
      week: game.week,
      label: `Week ${game.week} vs ${opponent?.name ?? "Unknown Opponent"}`,
      opponentId: game.opponentId,
      opponent: opponent?.name ?? "Unknown Opponent",
      date: game.date,
      result: game.result,
      score: `${game.scoreFor}-${game.scoreAgainst}`,
      scoreMargin: game.scoreFor - game.scoreAgainst,
      plays: stat?.plays ?? 0,
      offensiveEpa: round(stat?.offensiveEpa ?? 0, 2),
      defensiveEpaAllowed: round(stat?.defensiveEpaAllowed ?? 0, 2),
      epaPerPlay: round(ratio(stat?.offensiveEpa ?? 0, stat?.plays ?? 0), 3),
      successRate: round(stat?.successRate ?? 0, 3),
      explosiveRate: round(ratio(stat?.explosivePlays ?? 0, stat?.plays ?? 0), 3),
      driveEfficiency: round(ratio(scoringDrives.length, gameDrives.length), 3),
      pointsPerDrive: round(ratio(drivePointsTotal, gameDrives.length), 2),
      thirdDownRate: round(ratio(stat?.thirdDownConversions ?? 0, stat?.thirdDownAttempts ?? 0), 3),
      redZoneRate: round(ratio(stat?.redZoneTouchdowns ?? 0, stat?.redZoneTrips ?? 0), 3),
      turnoverRate: round(ratio(stat?.turnovers ?? 0, stat?.plays ?? 0), 3),
      gameControl: round(50 + netEfficiency * 2.2 + (game.scoreFor - game.scoreAgainst) * 0.55 - strength * 4, 1),
    };
  });

  const plays = offensivePlays.map((play) => {
    const game = gamesById.get(play.gameId);
    const opponent = game ? opponentsById.get(game.opponentId) : undefined;
    const player = play.playerId ? playersById.get(play.playerId) : undefined;
    const zone = fieldZone(play.yardLine);

    return {
      id: play.id,
      gameId: play.gameId,
      driveId: play.driveId,
      week: game?.week ?? 0,
      opponentId: game?.opponentId ?? "",
      opponent: opponent?.name ?? "Unknown Opponent",
      quarter: play.quarter,
      down: play.down,
      distance: play.distance,
      distanceBucket: distanceBucket(play.distance),
      yardLine: play.yardLine,
      fieldPosition: fieldPositionLabel(play.yardLine),
      fieldZone: zone.fieldZone,
      fieldZoneLabel: zone.fieldZoneLabel,
      playType: play.playType,
      playTypeLabel: titleCase(play.playType),
      yardsGained: play.yardsGained,
      epa: round(play.epa, 3),
      success: play.success,
      explosive: play.explosive,
      turnover: play.turnover,
      redZone: play.redZone,
      playerId: play.playerId,
      playerName: player?.name ?? "Unassigned",
      scoreDiff: play.scoreDiff,
      scoreState: scoreState(play.scoreDiff),
    };
  });

  const playsByDriveId = groupBy(plays, (play) => play.driveId);
  const drives = offensiveDrives.map((drive) => {
    const game = gamesById.get(drive.gameId);
    const opponent = game ? opponentsById.get(game.opponentId) : undefined;
    const drivePlays = playsByDriveId.get(drive.id) ?? [];
    const points = drivePoints(drive.result);

    return {
      id: drive.id,
      gameId: drive.gameId,
      week: game?.week ?? 0,
      opponentId: game?.opponentId ?? "",
      opponent: opponent?.name ?? "Unknown Opponent",
      quarter: drive.quarter,
      startYardLine: drive.startYardLine,
      endYardLine: drive.endYardLine,
      startFieldPosition: fieldPositionLabel(drive.startYardLine),
      endFieldPosition: fieldPositionLabel(drive.endYardLine),
      playCount: drive.playCount,
      yards: drive.yards,
      result: drive.result,
      resultLabel: titleCase(drive.result),
      points,
      epa: round(drive.epa, 2),
      epaPerPlay: round(ratio(drive.epa, Math.max(drivePlays.length, drive.playCount)), 3),
      startScoreDiff: drive.startScoreDiff,
      scoringDrive: points > 0,
      turnoverDrive: drive.result === "turnover",
    };
  });

  const opponentOptions = dataset.opponents
    .map((opponent) => ({
      value: opponent.id,
      label: opponent.name,
      meta: opponent.record,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const playTypes = playTypeOrder.filter((playType) => offensivePlays.some((play) => play.playType === playType));

  return {
    team: {
      name: dataset.team.name,
      season: dataset.team.season,
      classification: dataset.team.classification,
      isDemoData: dataset.team.isDemoData,
    },
    generatedAt: dataset.generatedAt,
    filters: {
      games: games.map((game) => ({
        value: game.id,
        label: game.label,
        meta: `${game.result} ${game.score}`,
      })),
      opponents: opponentOptions,
      quarters: [1, 2, 3, 4].map((quarter) => ({ value: String(quarter), label: `Quarter ${quarter}` })),
      downs: [1, 2, 3, 4].map((down) => ({ value: String(down), label: downLabel(down as 1 | 2 | 3 | 4) })),
      playTypes: playTypes.map((playType) => ({ value: playType, label: titleCase(playType) })),
      redZone: [
        { value: "true", label: "Red Zone" },
        { value: "false", label: "Outside Red Zone" },
      ],
    },
    summary: {
      games: dataset.games.length,
      wins: dataset.games.filter((game) => game.result === "W").length,
      losses: dataset.games.filter((game) => game.result === "L").length,
      plays: plays.length,
      drives: drives.length,
      players: dataset.players.length,
    },
    games,
    plays,
    drives,
    methodologyNotes: [
      "All dashboard calculations use Mount Olive offensive play and drive records from the current dataset.",
      "The field visualization bins ball position by yard line. Player-tracking coordinates are not present in the current table, so spacing and route depth are not inferred here.",
      "Expected-points-at-start and counterfactual play-call models are not present in the current dataset. Drive analysis therefore reports observed drive EPA, points, yards, and result only.",
      "Sample-size confidence is based on the selected filter set and should be treated as directional for narrow splits.",
    ],
  };
}
