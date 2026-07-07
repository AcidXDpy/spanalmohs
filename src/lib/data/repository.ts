import type { AnalyticsDataset } from "@/types";
import { sampleFootballDataset } from "@/lib/data/sample-football";

export function getAnalyticsDataset(): AnalyticsDataset {
  return sampleFootballDataset;
}

export const csvImportSchemas = [
  {
    entity: "Players",
    requiredColumns: ["id", "name", "number", "position", "classYear", "heightInches", "weightPounds"],
    optionalColumns: ["status", "primaryUnit", "archetype"],
  },
  {
    entity: "Games",
    requiredColumns: ["id", "date", "opponentId", "scoreFor", "scoreAgainst", "result"],
    optionalColumns: ["location", "winProbabilityStart", "winProbabilityEnd", "notes"],
  },
  {
    entity: "Plays",
    requiredColumns: ["id", "gameId", "driveId", "down", "distance", "yardLine", "playType", "yardsGained"],
    optionalColumns: ["epa", "success", "explosive", "turnover", "playerId", "scoreDiff"],
  },
  {
    entity: "Player Stats",
    requiredColumns: ["gameId", "playerId", "snaps", "opportunities", "yards", "epaContribution"],
    optionalColumns: ["touchdowns", "tackles", "disruptionPlays", "assignmentGrade"],
  },
];

export function getLatestGame(dataset = getAnalyticsDataset()) {
  return [...dataset.games].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function getOpponentName(opponentId: string, dataset = getAnalyticsDataset()) {
  return dataset.opponents.find((opponent) => opponent.id === opponentId)?.name ?? "Unknown";
}

export function getPlayerName(playerId: string, dataset = getAnalyticsDataset()) {
  return dataset.players.find((player) => player.id === playerId)?.name ?? "Unknown";
}

export function getGameLabel(gameId: string, dataset = getAnalyticsDataset()) {
  const game = dataset.games.find((item) => item.id === gameId);

  if (!game) {
    return gameId;
  }

  return `Week ${game.week} vs ${getOpponentName(game.opponentId, dataset)}`;
}
