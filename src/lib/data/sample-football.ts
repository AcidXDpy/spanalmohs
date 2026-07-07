import type {
  AnalyticsDataset,
  AvailabilityNote,
  Drive,
  Game,
  Opponent,
  Play,
  Player,
  PlayerGameStat,
  PracticeRecord,
  ScoutingNote,
  Team,
  TeamGameStat,
} from "@/types";
import { clamp, round } from "@/lib/math";

export const team: Team = {
  id: "mount-olive-football",
  sport: "football",
  name: "Mount Olive Football",
  school: "Mount Olive High School",
  season: "2026 demo season",
  classification: "North Jersey Group 4",
  isDemoData: true,
};

export const players: Player[] = [
  {
    id: "p-qb-12",
    sport: "football",
    name: "Evan Rinaldi",
    number: 12,
    position: "QB",
    classYear: "Senior",
    heightInches: 74,
    weightPounds: 188,
    primaryUnit: "offense",
    status: "available",
    archetype: "Rhythm passer / constraint runner",
  },
  {
    id: "p-rb-21",
    sport: "football",
    name: "Marcus Bell",
    number: 21,
    position: "RB",
    classYear: "Junior",
    heightInches: 70,
    weightPounds: 196,
    primaryUnit: "offense",
    status: "available",
    archetype: "Explosive early-down runner",
  },
  {
    id: "p-wr-4",
    sport: "football",
    name: "Noah Stein",
    number: 4,
    position: "WR",
    classYear: "Senior",
    heightInches: 72,
    weightPounds: 174,
    primaryUnit: "offense",
    status: "available",
    archetype: "Vertical separator",
  },
  {
    id: "p-wr-7",
    sport: "football",
    name: "Kai Morrison",
    number: 7,
    position: "WR",
    classYear: "Junior",
    heightInches: 71,
    weightPounds: 168,
    primaryUnit: "offense",
    status: "limited",
    archetype: "Space target / motion asset",
  },
  {
    id: "p-te-88",
    sport: "football",
    name: "Owen Velez",
    number: 88,
    position: "TE",
    classYear: "Senior",
    heightInches: 76,
    weightPounds: 222,
    primaryUnit: "offense",
    status: "available",
    archetype: "Inline efficiency stabilizer",
  },
  {
    id: "p-ol-55",
    sport: "football",
    name: "Tyler Han",
    number: 55,
    position: "OL",
    classYear: "Senior",
    heightInches: 73,
    weightPounds: 248,
    primaryUnit: "offense",
    status: "available",
    archetype: "Run-game anchor",
  },
  {
    id: "p-lb-9",
    sport: "football",
    name: "Julian Costa",
    number: 9,
    position: "LB",
    classYear: "Senior",
    heightInches: 72,
    weightPounds: 205,
    primaryUnit: "defense",
    status: "available",
    archetype: "Coverage linebacker / pressure finisher",
  },
  {
    id: "p-db-3",
    sport: "football",
    name: "Darius King",
    number: 3,
    position: "DB",
    classYear: "Junior",
    heightInches: 70,
    weightPounds: 170,
    primaryUnit: "defense",
    status: "available",
    archetype: "Man-match corner",
  },
  {
    id: "p-dl-91",
    sport: "football",
    name: "Samir Patel",
    number: 91,
    position: "DL",
    classYear: "Senior",
    heightInches: 74,
    weightPounds: 236,
    primaryUnit: "defense",
    status: "questionable",
    archetype: "Interior disruption",
  },
  {
    id: "p-ath-15",
    sport: "football",
    name: "Chris Alston",
    number: 15,
    position: "ATH",
    classYear: "Sophomore",
    heightInches: 71,
    weightPounds: 181,
    primaryUnit: "two-way",
    status: "available",
    archetype: "Two-way leverage player",
  },
];

export const opponents: Opponent[] = [
  {
    id: "opp-randolph",
    sport: "football",
    name: "Randolph",
    record: "4-2",
    style: "Condensed formations, play-action shots",
    offensivePace: 62,
    defensivePressure: 71,
    strengthRating: 0.61,
    riskProfile: "High pressure on third-and-medium",
  },
  {
    id: "opp-roxbury",
    sport: "football",
    name: "Roxbury",
    record: "3-3",
    style: "Power run, heavy boxes",
    offensivePace: 54,
    defensivePressure: 58,
    strengthRating: 0.47,
    riskProfile: "Low variance unless they create short fields",
  },
  {
    id: "opp-morris-hills",
    sport: "football",
    name: "Morris Hills",
    record: "2-4",
    style: "Tempo spread, RPO screens",
    offensivePace: 76,
    defensivePressure: 44,
    strengthRating: 0.38,
    riskProfile: "Explosive if missed tackles compound",
  },
  {
    id: "opp-west-morris",
    sport: "football",
    name: "West Morris",
    record: "5-1",
    style: "Option run, field-position control",
    offensivePace: 50,
    defensivePressure: 66,
    strengthRating: 0.72,
    riskProfile: "Possession drain and fourth-down aggression",
  },
  {
    id: "opp-chatham",
    sport: "football",
    name: "Chatham",
    record: "3-4",
    style: "Balanced 11 personnel",
    offensivePace: 61,
    defensivePressure: 52,
    strengthRating: 0.44,
    riskProfile: "Good red-zone constraint coverage",
  },
  {
    id: "opp-sparta",
    sport: "football",
    name: "Sparta",
    record: "6-1",
    style: "Spread passing, simulated pressures",
    offensivePace: 79,
    defensivePressure: 74,
    strengthRating: 0.78,
    riskProfile: "Can create fast negative scripts",
  },
];

export const games: Game[] = [
  {
    id: "game-01",
    sport: "football",
    date: "2026-09-04",
    week: 1,
    opponentId: "opp-randolph",
    location: "home",
    scoreFor: 28,
    scoreAgainst: 24,
    result: "W",
    winProbabilityStart: 0.49,
    winProbabilityEnd: 0.93,
    notes: "Two late explosive passes reversed a negative second-quarter field-position stretch.",
  },
  {
    id: "game-02",
    sport: "football",
    date: "2026-09-11",
    week: 2,
    opponentId: "opp-roxbury",
    location: "away",
    scoreFor: 21,
    scoreAgainst: 17,
    result: "W",
    winProbabilityStart: 0.56,
    winProbabilityEnd: 0.86,
    notes: "Drive finish rate offset a below-average explosive play profile.",
  },
  {
    id: "game-03",
    sport: "football",
    date: "2026-09-18",
    week: 3,
    opponentId: "opp-morris-hills",
    location: "home",
    scoreFor: 35,
    scoreAgainst: 14,
    result: "W",
    winProbabilityStart: 0.64,
    winProbabilityEnd: 0.98,
    notes: "Best offensive EPA and strongest defensive disruption of the sample.",
  },
  {
    id: "game-04",
    sport: "football",
    date: "2026-09-25",
    week: 4,
    opponentId: "opp-west-morris",
    location: "away",
    scoreFor: 17,
    scoreAgainst: 27,
    result: "L",
    winProbabilityStart: 0.42,
    winProbabilityEnd: 0.18,
    notes: "Opponent controlled tempo and created two short-field scoring drives.",
  },
  {
    id: "game-05",
    sport: "football",
    date: "2026-10-02",
    week: 5,
    opponentId: "opp-chatham",
    location: "home",
    scoreFor: 24,
    scoreAgainst: 20,
    result: "W",
    winProbabilityStart: 0.58,
    winProbabilityEnd: 0.89,
    notes: "Third-down defense protected a narrow possession advantage.",
  },
  {
    id: "game-06",
    sport: "football",
    date: "2026-10-09",
    week: 6,
    opponentId: "opp-sparta",
    location: "neutral",
    scoreFor: 20,
    scoreAgainst: 31,
    result: "L",
    winProbabilityStart: 0.39,
    winProbabilityEnd: 0.22,
    notes: "High-value opponent passing downs exposed protection and coverage depth.",
  },
];

export const teamGameStats: TeamGameStat[] = [
  {
    id: "tgs-01",
    gameId: "game-01",
    plays: 64,
    yards: 386,
    offensiveEpa: 8.8,
    defensiveEpaAllowed: 5.1,
    successRate: 0.48,
    explosivePlays: 7,
    thirdDownAttempts: 12,
    thirdDownConversions: 6,
    redZoneTrips: 4,
    redZoneTouchdowns: 3,
    turnovers: 1,
    takeaways: 2,
    penalties: 6,
    penaltyYards: 48,
    averageStartingFieldPosition: 33,
  },
  {
    id: "tgs-02",
    gameId: "game-02",
    plays: 59,
    yards: 318,
    offensiveEpa: 4.4,
    defensiveEpaAllowed: 2.9,
    successRate: 0.44,
    explosivePlays: 4,
    thirdDownAttempts: 11,
    thirdDownConversions: 5,
    redZoneTrips: 3,
    redZoneTouchdowns: 3,
    turnovers: 1,
    takeaways: 1,
    penalties: 4,
    penaltyYards: 35,
    averageStartingFieldPosition: 31,
  },
  {
    id: "tgs-03",
    gameId: "game-03",
    plays: 67,
    yards: 442,
    offensiveEpa: 14.6,
    defensiveEpaAllowed: -2.8,
    successRate: 0.56,
    explosivePlays: 9,
    thirdDownAttempts: 10,
    thirdDownConversions: 7,
    redZoneTrips: 5,
    redZoneTouchdowns: 4,
    turnovers: 0,
    takeaways: 3,
    penalties: 3,
    penaltyYards: 21,
    averageStartingFieldPosition: 39,
  },
  {
    id: "tgs-04",
    gameId: "game-04",
    plays: 55,
    yards: 274,
    offensiveEpa: -1.7,
    defensiveEpaAllowed: 8.9,
    successRate: 0.38,
    explosivePlays: 3,
    thirdDownAttempts: 13,
    thirdDownConversions: 4,
    redZoneTrips: 3,
    redZoneTouchdowns: 2,
    turnovers: 2,
    takeaways: 1,
    penalties: 7,
    penaltyYards: 62,
    averageStartingFieldPosition: 27,
  },
  {
    id: "tgs-05",
    gameId: "game-05",
    plays: 61,
    yards: 341,
    offensiveEpa: 5.9,
    defensiveEpaAllowed: 3.8,
    successRate: 0.46,
    explosivePlays: 5,
    thirdDownAttempts: 12,
    thirdDownConversions: 6,
    redZoneTrips: 4,
    redZoneTouchdowns: 3,
    turnovers: 1,
    takeaways: 2,
    penalties: 5,
    penaltyYards: 41,
    averageStartingFieldPosition: 34,
  },
  {
    id: "tgs-06",
    gameId: "game-06",
    plays: 58,
    yards: 302,
    offensiveEpa: 0.8,
    defensiveEpaAllowed: 11.4,
    successRate: 0.41,
    explosivePlays: 4,
    thirdDownAttempts: 14,
    thirdDownConversions: 5,
    redZoneTrips: 3,
    redZoneTouchdowns: 2,
    turnovers: 2,
    takeaways: 1,
    penalties: 6,
    penaltyYards: 54,
    averageStartingFieldPosition: 29,
  },
];

const driveInputs: Array<Omit<Drive, "id">> = [
  { gameId: "game-01", offense: "mount-olive", quarter: 1, startYardLine: 25, endYardLine: 100, playCount: 8, yards: 75, result: "touchdown", epa: 4.7, startScoreDiff: 0 },
  { gameId: "game-01", offense: "mount-olive", quarter: 2, startYardLine: 18, endYardLine: 44, playCount: 6, yards: 26, result: "punt", epa: -0.6, startScoreDiff: 0 },
  { gameId: "game-01", offense: "mount-olive", quarter: 3, startYardLine: 36, endYardLine: 81, playCount: 7, yards: 45, result: "field-goal", epa: 1.9, startScoreDiff: -3 },
  { gameId: "game-01", offense: "mount-olive", quarter: 4, startYardLine: 42, endYardLine: 100, playCount: 5, yards: 58, result: "touchdown", epa: 5.1, startScoreDiff: -3 },
  { gameId: "game-01", offense: "opponent", quarter: 4, startYardLine: 22, endYardLine: 69, playCount: 8, yards: 47, result: "turnover", epa: -2.2, startScoreDiff: 4 },

  { gameId: "game-02", offense: "mount-olive", quarter: 1, startYardLine: 30, endYardLine: 100, playCount: 9, yards: 70, result: "touchdown", epa: 4.1, startScoreDiff: 0 },
  { gameId: "game-02", offense: "mount-olive", quarter: 2, startYardLine: 21, endYardLine: 50, playCount: 7, yards: 29, result: "punt", epa: -0.4, startScoreDiff: 0 },
  { gameId: "game-02", offense: "mount-olive", quarter: 3, startYardLine: 39, endYardLine: 100, playCount: 8, yards: 61, result: "touchdown", epa: 3.8, startScoreDiff: -3 },
  { gameId: "game-02", offense: "mount-olive", quarter: 4, startYardLine: 47, endYardLine: 100, playCount: 6, yards: 53, result: "touchdown", epa: 4.3, startScoreDiff: -3 },
  { gameId: "game-02", offense: "opponent", quarter: 4, startYardLine: 25, endYardLine: 62, playCount: 7, yards: 37, result: "downs", epa: -1.6, startScoreDiff: 4 },

  { gameId: "game-03", offense: "mount-olive", quarter: 1, startYardLine: 33, endYardLine: 100, playCount: 6, yards: 67, result: "touchdown", epa: 5.3, startScoreDiff: 0 },
  { gameId: "game-03", offense: "mount-olive", quarter: 2, startYardLine: 41, endYardLine: 100, playCount: 7, yards: 59, result: "touchdown", epa: 4.8, startScoreDiff: 7 },
  { gameId: "game-03", offense: "mount-olive", quarter: 3, startYardLine: 38, endYardLine: 100, playCount: 8, yards: 62, result: "touchdown", epa: 4.6, startScoreDiff: 14 },
  { gameId: "game-03", offense: "mount-olive", quarter: 4, startYardLine: 28, endYardLine: 78, playCount: 7, yards: 50, result: "field-goal", epa: 2.6, startScoreDiff: 21 },
  { gameId: "game-03", offense: "opponent", quarter: 2, startYardLine: 24, endYardLine: 36, playCount: 5, yards: 12, result: "turnover", epa: -2.8, startScoreDiff: -7 },

  { gameId: "game-04", offense: "mount-olive", quarter: 1, startYardLine: 22, endYardLine: 57, playCount: 8, yards: 35, result: "punt", epa: -0.2, startScoreDiff: 0 },
  { gameId: "game-04", offense: "mount-olive", quarter: 2, startYardLine: 31, endYardLine: 100, playCount: 9, yards: 69, result: "touchdown", epa: 3.7, startScoreDiff: -7 },
  { gameId: "game-04", offense: "mount-olive", quarter: 3, startYardLine: 44, endYardLine: 77, playCount: 6, yards: 33, result: "turnover", epa: -3.1, startScoreDiff: -3 },
  { gameId: "game-04", offense: "mount-olive", quarter: 4, startYardLine: 35, endYardLine: 100, playCount: 8, yards: 65, result: "touchdown", epa: 3.6, startScoreDiff: -10 },
  { gameId: "game-04", offense: "opponent", quarter: 4, startYardLine: 46, endYardLine: 100, playCount: 5, yards: 54, result: "touchdown", epa: 4.9, startScoreDiff: 3 },

  { gameId: "game-05", offense: "mount-olive", quarter: 1, startYardLine: 29, endYardLine: 82, playCount: 9, yards: 53, result: "field-goal", epa: 2.0, startScoreDiff: 0 },
  { gameId: "game-05", offense: "mount-olive", quarter: 2, startYardLine: 37, endYardLine: 100, playCount: 7, yards: 63, result: "touchdown", epa: 4.5, startScoreDiff: -4 },
  { gameId: "game-05", offense: "mount-olive", quarter: 3, startYardLine: 20, endYardLine: 48, playCount: 6, yards: 28, result: "punt", epa: -0.5, startScoreDiff: 3 },
  { gameId: "game-05", offense: "mount-olive", quarter: 4, startYardLine: 40, endYardLine: 100, playCount: 8, yards: 60, result: "touchdown", epa: 4.2, startScoreDiff: -3 },
  { gameId: "game-05", offense: "opponent", quarter: 4, startYardLine: 24, endYardLine: 70, playCount: 10, yards: 46, result: "downs", epa: -1.2, startScoreDiff: 4 },

  { gameId: "game-06", offense: "mount-olive", quarter: 1, startYardLine: 24, endYardLine: 79, playCount: 8, yards: 55, result: "field-goal", epa: 1.6, startScoreDiff: 0 },
  { gameId: "game-06", offense: "mount-olive", quarter: 2, startYardLine: 28, endYardLine: 51, playCount: 6, yards: 23, result: "turnover", epa: -2.9, startScoreDiff: -7 },
  { gameId: "game-06", offense: "mount-olive", quarter: 3, startYardLine: 32, endYardLine: 100, playCount: 9, yards: 68, result: "touchdown", epa: 4.0, startScoreDiff: -14 },
  { gameId: "game-06", offense: "mount-olive", quarter: 4, startYardLine: 43, endYardLine: 100, playCount: 6, yards: 57, result: "touchdown", epa: 3.5, startScoreDiff: -11 },
  { gameId: "game-06", offense: "opponent", quarter: 3, startYardLine: 36, endYardLine: 100, playCount: 7, yards: 64, result: "touchdown", epa: 5.2, startScoreDiff: 14 },
];

export const drives: Drive[] = driveInputs.map((drive, index) => ({
  ...drive,
  id: `${drive.gameId}-drive-${String(index + 1).padStart(2, "0")}`,
}));

const offensivePlayerCycle = [
  "p-rb-21",
  "p-qb-12",
  "p-wr-4",
  "p-te-88",
  "p-wr-7",
  "p-ath-15",
];

function playTypeFor(drive: Drive, index: number): Play["playType"] {
  if (drive.result === "field-goal" && index === drive.playCount - 1) {
    return "field-goal";
  }

  if (drive.result === "punt" && index === drive.playCount - 1) {
    return "punt";
  }

  if (index % 6 === 4) {
    return "screen";
  }

  return index % 2 === 0 ? "run" : "pass";
}

function generatePlaysForDrive(drive: Drive): Play[] {
  let accumulatedYards = 0;

  return Array.from({ length: drive.playCount }, (_, index) => {
    const playType = playTypeFor(drive, index);
    const down = ((index % 4) + 1) as 1 | 2 | 3 | 4;
    const distance = Math.max(1, 10 - (index % 3) * 2 + (down === 3 ? 1 : 0));
    const isFinalPlay = index === drive.playCount - 1;
    const turnover = drive.result === "turnover" && isFinalPlay;
    const baseYards = drive.yards / drive.playCount;
    const variation = ((index % 5) - 2) * (drive.result === "touchdown" ? 2.2 : 1.4);
    const specialTeamsAdjustment = playType === "punt" || playType === "field-goal" ? -baseYards : 0;
    const yardsGained = Math.round(
      clamp(baseYards + variation + specialTeamsAdjustment, turnover ? -8 : -5, 34)
    );
    const yardLine = clamp(drive.startYardLine + accumulatedYards, 1, 99);
    const explosive =
      (playType === "pass" || playType === "screen") ? yardsGained >= 16 : yardsGained >= 11;
    const success =
      down === 1
        ? yardsGained >= 4
        : down === 2
          ? yardsGained >= Math.ceil(distance * 0.55)
          : yardsGained >= distance;
    const epa = round(
      drive.epa / drive.playCount +
        (success ? 0.18 : -0.16) +
        (explosive ? 0.72 : 0) +
        (turnover ? -2.5 : 0),
      2
    );

    accumulatedYards = clamp(accumulatedYards + Math.max(yardsGained, -4), 0, 99);

    return {
      id: `${drive.id}-play-${String(index + 1).padStart(2, "0")}`,
      gameId: drive.gameId,
      driveId: drive.id,
      offense: drive.offense,
      quarter: drive.quarter,
      down,
      distance,
      yardLine,
      playType,
      yardsGained,
      epa,
      success,
      explosive,
      turnover,
      redZone: yardLine >= 80,
      playerId:
        drive.offense === "mount-olive" && playType !== "punt" && playType !== "field-goal"
          ? offensivePlayerCycle[(index + drive.quarter) % offensivePlayerCycle.length]
          : undefined,
      scoreDiff: drive.startScoreDiff,
    };
  });
}

export const plays: Play[] = drives.flatMap(generatePlaysForDrive);

const trackedPlayerIds = [
  "p-qb-12",
  "p-rb-21",
  "p-wr-4",
  "p-wr-7",
  "p-te-88",
  "p-lb-9",
  "p-db-3",
  "p-dl-91",
  "p-ath-15",
];

const playerBase: Record<
  string,
  { snaps: number; opportunities: number; yards: number; tackles: number; disruption: number; epa: number }
> = {
  "p-qb-12": { snaps: 58, opportunities: 27, yards: 214, tackles: 0, disruption: 0, epa: 4.1 },
  "p-rb-21": { snaps: 43, opportunities: 18, yards: 102, tackles: 0, disruption: 0, epa: 2.7 },
  "p-wr-4": { snaps: 45, opportunities: 8, yards: 77, tackles: 0, disruption: 0, epa: 2.1 },
  "p-wr-7": { snaps: 32, opportunities: 6, yards: 48, tackles: 0, disruption: 0, epa: 1.1 },
  "p-te-88": { snaps: 50, opportunities: 5, yards: 36, tackles: 0, disruption: 0, epa: 1.4 },
  "p-lb-9": { snaps: 56, opportunities: 0, yards: 0, tackles: 8, disruption: 3, epa: 2.2 },
  "p-db-3": { snaps: 53, opportunities: 0, yards: 0, tackles: 5, disruption: 2, epa: 1.6 },
  "p-dl-91": { snaps: 40, opportunities: 0, yards: 0, tackles: 4, disruption: 2, epa: 1.3 },
  "p-ath-15": { snaps: 36, opportunities: 5, yards: 42, tackles: 3, disruption: 1, epa: 1.5 },
};

export const playerGameStats: PlayerGameStat[] = games.flatMap((game, gameIndex) => {
  const gameStat = teamGameStats.find((stat) => stat.gameId === game.id);
  const teamEfficiency = gameStat?.successRate ?? 0.44;
  const resultBoost = game.result === "W" ? 0.3 : -0.35;

  return trackedPlayerIds.map((playerId, playerIndex) => {
    const base = playerBase[playerId]!;
    const wave = ((gameIndex + playerIndex) % 4) - 1.5;
    const availabilityDrag = playerId === "p-dl-91" && gameIndex >= 4 ? -0.45 : 0;
    const opportunities =
      base.opportunities > 0 ? Math.max(1, Math.round(base.opportunities + wave)) : 0;
    const yards =
      base.yards > 0
        ? Math.max(0, Math.round(base.yards * (0.84 + teamEfficiency + wave * 0.04)))
        : 0;
    const epaContribution = round(base.epa + resultBoost + wave * 0.22 + availabilityDrag, 2);

    return {
      id: `${game.id}-${playerId}`,
      gameId: game.id,
      playerId,
      snaps: Math.max(12, Math.round(base.snaps + wave * 4 + (playerId === "p-wr-7" ? -3 : 0))),
      opportunities,
      yards,
      touchdowns:
        opportunities > 0 && (gameIndex + playerIndex) % 3 === 0
          ? 1
          : playerId === "p-lb-9" && gameIndex === 2
            ? 1
            : 0,
      tackles: Math.max(0, Math.round(base.tackles + wave)),
      disruptionPlays: Math.max(0, Math.round(base.disruption + wave * 0.4)),
      epaContribution,
      onFieldNetEpa: round(epaContribution + (teamEfficiency - 0.42) * 8, 2),
      assignmentGrade: round(clamp(78 + epaContribution * 2.4 + wave * 1.2, 61, 97), 1),
    };
  });
});

export const scoutingNotes: ScoutingNote[] = [
  {
    id: "note-01",
    sport: "football",
    opponentId: "opp-sparta",
    category: "Protection risk",
    note: "Sparta generated pressure on 43% of simulated-pressure snaps in the sample. Slide protection toward the boundary nickel on third-and-6 plus.",
    confidence: 0.71,
  },
  {
    id: "note-02",
    sport: "football",
    opponentId: "opp-west-morris",
    category: "Tempo constraint",
    note: "West Morris reduces total possessions. First-down success above 45% is the main threshold for avoiding a negative possession script.",
    confidence: 0.77,
  },
  {
    id: "note-03",
    sport: "football",
    playerId: "p-rb-21",
    category: "Player usage",
    note: "Bell's efficiency climbs when his first two carries in a series include at least one gap-scheme concept. Outside zone volume has been less stable.",
    confidence: 0.66,
  },
  {
    id: "note-04",
    sport: "football",
    playerId: "p-db-3",
    category: "Coverage leverage",
    note: "King has allowed fewer explosive plays when aligned with inside shade against reduced splits. Maintain safety rotation help only against switch releases.",
    confidence: 0.63,
  },
  {
    id: "note-05",
    sport: "football",
    gameId: "game-04",
    category: "Postgame review",
    note: "The loss was driven less by total efficiency than by turnover timing and short-field leverage. Removing the third-quarter turnover lifts estimated win probability by 18 points.",
    confidence: 0.7,
  },
];

export const practiceRecords: PracticeRecord[] = [
  {
    id: "practice-01",
    sport: "football",
    date: "2026-09-29",
    period: "Inside run",
    focus: "Gap-scheme fits versus odd front",
    executionScore: 84,
    notes: "First group created cleaner double-team movement after cadence adjustment.",
  },
  {
    id: "practice-02",
    sport: "football",
    date: "2026-09-30",
    period: "Third down",
    focus: "Protection versus simulated pressure",
    executionScore: 73,
    notes: "Backside B-gap pickup remains the largest protection risk.",
  },
  {
    id: "practice-03",
    sport: "football",
    date: "2026-10-01",
    period: "Red zone",
    focus: "Compressed field route spacing",
    executionScore: 81,
    notes: "Best outcomes came from motion to identify leverage before the snap.",
  },
  {
    id: "practice-04",
    sport: "football",
    date: "2026-10-06",
    period: "Scout offense",
    focus: "Sparta tempo and switch releases",
    executionScore: 76,
    notes: "Defensive communication improved after simplifying the trips check.",
  },
];

export const availabilityNotes: AvailabilityNote[] = [
  {
    id: "availability-01",
    playerId: "p-wr-7",
    date: "2026-10-02",
    status: "limited",
    note: "Managed lower-body workload. Available for scripted motion packages.",
  },
  {
    id: "availability-02",
    playerId: "p-dl-91",
    date: "2026-10-09",
    status: "questionable",
    note: "Practice reps limited. Pass-rush burst below season baseline.",
  },
  {
    id: "availability-03",
    playerId: "p-qb-12",
    date: "2026-10-09",
    status: "available",
    note: "Full participant. Throwing volume normal.",
  },
];

export const sampleFootballDataset: AnalyticsDataset = {
  team,
  players,
  opponents,
  games,
  teamGameStats,
  drives,
  plays,
  playerGameStats,
  scoutingNotes,
  practiceRecords,
  availabilityNotes,
  generatedAt: "2026-07-07T17:30:00-04:00",
};
