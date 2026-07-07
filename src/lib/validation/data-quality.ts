import type {
  AnalyticsDataset,
  CompletenessScore,
  DataQualityFlag,
  Game,
  Play,
  Player,
  TeamGameStat,
} from "@/types";
import { round } from "@/lib/math";

type EntityRecord = Record<string, unknown>;

const requiredFields: Record<string, string[]> = {
  players: ["id", "name", "number", "position", "classYear", "heightInches", "weightPounds", "status"],
  opponents: ["id", "name", "record", "style", "strengthRating"],
  games: ["id", "date", "opponentId", "scoreFor", "scoreAgainst", "result"],
  drives: ["id", "gameId", "offense", "quarter", "startYardLine", "playCount", "result", "epa"],
  plays: ["id", "gameId", "driveId", "down", "distance", "yardLine", "playType", "yardsGained", "epa"],
  playerGameStats: ["gameId", "playerId", "snaps", "opportunities", "epaContribution", "assignmentGrade"],
  scoutingNotes: ["id", "category", "note", "confidence"],
  practiceRecords: ["id", "date", "period", "focus", "executionScore"],
  availabilityNotes: ["id", "playerId", "date", "status", "note"],
};

function isPresent(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

function scoreEntity(entity: string, records: EntityRecord[]): CompletenessScore {
  const fields = requiredFields[entity] ?? [];
  const totalFields = fields.length * Math.max(records.length, 1);
  const presentFields = records.reduce(
    (total, record) => total + fields.filter((field) => isPresent(record[field])).length,
    0
  );

  return {
    entity,
    score: round(totalFields === 0 ? 1 : presentFields / totalFields, 3),
    presentFields,
    totalFields,
  };
}

function flagMissingLinks(dataset: AnalyticsDataset): DataQualityFlag[] {
  const flags: DataQualityFlag[] = [];
  const opponentIds = new Set(dataset.opponents.map((opponent) => opponent.id));
  const gameIds = new Set(dataset.games.map((game) => game.id));
  const driveIds = new Set(dataset.drives.map((drive) => drive.id));
  const playerIds = new Set(dataset.players.map((player) => player.id));

  dataset.games.forEach((game) => {
    if (!opponentIds.has(game.opponentId)) {
      flags.push({
        id: `missing-opponent-${game.id}`,
        severity: "critical",
        entity: "games",
        message: `Game ${game.id} references an unknown opponent.`,
        recommendation: "Add the opponent record before using this game in scouting or model training.",
      });
    }
  });

  dataset.plays.forEach((play) => {
    if (!gameIds.has(play.gameId) || !driveIds.has(play.driveId)) {
      flags.push({
        id: `missing-play-link-${play.id}`,
        severity: "critical",
        entity: "plays",
        message: `Play ${play.id} has a missing game or drive link.`,
        recommendation: "Re-import the play row with valid gameId and driveId references.",
      });
    }

    if (play.playerId && !playerIds.has(play.playerId)) {
      flags.push({
        id: `missing-player-${play.id}`,
        severity: "warning",
        entity: "plays",
        message: `Play ${play.id} references an unknown player.`,
        recommendation: "Map imported jersey numbers to canonical player IDs.",
      });
    }
  });

  return flags;
}

function flagSuspiciousGames(games: Game[], stats: TeamGameStat[]): DataQualityFlag[] {
  return games.flatMap((game) => {
    const gameStats = stats.find((item) => item.gameId === game.id);
    const flags: DataQualityFlag[] = [];

    if (!gameStats) {
      flags.push({
        id: `missing-team-stat-${game.id}`,
        severity: "warning",
        entity: "teamGameStats",
        message: `No team stat row exists for Week ${game.week}.`,
        recommendation: "Add team-level totals so dashboards and models can calculate complete rates.",
      });
    }

    if (game.result === "W" && game.scoreFor <= game.scoreAgainst) {
      flags.push({
        id: `result-score-mismatch-${game.id}`,
        severity: "critical",
        entity: "games",
        message: `Week ${game.week} is marked as a win but the score does not support it.`,
        recommendation: "Correct either result or final score before reporting record-based metrics.",
      });
    }

    if (game.winProbabilityEnd > 0.8 && game.result === "L") {
      flags.push({
        id: `win-probability-mismatch-${game.id}`,
        severity: "warning",
        entity: "games",
        message: `Week ${game.week} has a high final win probability but is recorded as a loss.`,
        recommendation: "Inspect the win probability feed for a late-game update issue.",
      });
    }

    return flags;
  });
}

function flagSuspiciousPlays(plays: Play[]): DataQualityFlag[] {
  const flags: DataQualityFlag[] = [];
  const sampleSize = plays.filter((play) => play.offense === "mount-olive").length;

  if (sampleSize < 200) {
    flags.push({
      id: "small-play-sample",
      severity: "info",
      entity: "plays",
      message: `Only ${sampleSize} Mount Olive offensive plays are available.`,
      recommendation:
        "Treat model outputs as exploratory until a larger multi-game sample is imported.",
    });
  }

  plays.forEach((play) => {
    if (Math.abs(play.epa) > 7) {
      flags.push({
        id: `epa-outlier-${play.id}`,
        severity: "warning",
        entity: "plays",
        message: `Play ${play.id} has an unusually large EPA value.`,
        recommendation: "Verify score, field position, turnover, and expected-points inputs.",
      });
    }

    if (play.down < 1 || play.down > 4 || play.distance <= 0) {
      flags.push({
        id: `down-distance-${play.id}`,
        severity: "critical",
        entity: "plays",
        message: `Play ${play.id} has invalid down or distance data.`,
        recommendation: "Correct the imported play row before situational metrics are used.",
      });
    }
  });

  return flags;
}

function flagAvailability(dataset: AnalyticsDataset): DataQualityFlag[] {
  const playerIds = new Set(dataset.players.map((player) => player.id));

  return dataset.availabilityNotes
    .filter((note) => !playerIds.has(note.playerId))
    .map((note) => ({
      id: `availability-player-${note.id}`,
      severity: "warning" as const,
      entity: "availabilityNotes",
      message: `Availability note ${note.id} references an unknown player.`,
      recommendation: "Link the note to a rostered player or remove it from active availability reports.",
    }));
}

export function evaluateDataQuality(dataset: AnalyticsDataset) {
  const completenessScores = Object.entries(requiredFields).map(([entity]) =>
    scoreEntity(entity, dataset[entity as keyof AnalyticsDataset] as unknown as EntityRecord[])
  );

  const flags = [
    ...flagMissingLinks(dataset),
    ...flagSuspiciousGames(dataset.games, dataset.teamGameStats),
    ...flagSuspiciousPlays(dataset.plays),
    ...flagAvailability(dataset),
  ];

  const overallCompleteness = round(
    completenessScores.reduce((total, score) => total + score.score, 0) /
      Math.max(completenessScores.length, 1),
    3
  );

  const criticalCount = flags.filter((flag) => flag.severity === "critical").length;
  const warningCount = flags.filter((flag) => flag.severity === "warning").length;

  return {
    completenessScores,
    flags,
    overallCompleteness,
    criticalCount,
    warningCount,
  };
}

export function normalizeImportedHeader(header: string) {
  return header.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

export function validateCsvHeaders(headers: string[], requiredColumns: string[]) {
  const normalizedHeaders = new Set(headers.map(normalizeImportedHeader));
  const missingColumns = requiredColumns.filter(
    (column) => !normalizedHeaders.has(normalizeImportedHeader(column))
  );

  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
}

export function rosterStatusSummary(players: Player[]) {
  return players.reduce<Record<string, number>>((summary, player) => {
    summary[player.status] = (summary[player.status] ?? 0) + 1;
    return summary;
  }, {});
}
