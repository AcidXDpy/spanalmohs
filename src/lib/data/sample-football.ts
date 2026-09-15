import type {
  AnalyticsDataset,
  AvailabilityNote,
  AvailabilityStatus,
  Drive,
  DriveResult,
  Game,
  GameResult,
  Opponent,
  Play,
  PlayType,
  Player,
  PlayerGameStat,
  PracticeRecord,
  ScoutingNote,
  Team,
  TeamGameStat,
  Unit,
} from "@/types";
import { clamp, mean, ratio, round, sigmoid, sum } from "@/lib/math";

type OffenseSide = Drive["offense"];

type WeightedOption<T> = {
  value: T;
  weight: number;
};

type PositionBlueprint = {
  position: string;
  count: number;
  primaryUnit: Unit;
  height: [number, number];
  weight: [number, number];
  preferredNumbers: number[];
  archetypes: string[];
};

type GameSimulation = {
  game: Game;
  stat: TeamGameStat;
  drives: Drive[];
  plays: Play[];
};

const DEMO_SEED = 20260708;
const GAME_COUNT = 36;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createSeededRandom(DEMO_SEED);

function randomBetween(min: number, max: number) {
  return min + random() * (max - min);
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomNormal(center = 0, deviation = 1) {
  const first = Math.max(random(), 0.000001);
  const second = Math.max(random(), 0.000001);
  return center + deviation * Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function choose<T>(items: readonly T[]) {
  return items[Math.floor(random() * items.length)]!;
}

function weighted<T>(options: Array<WeightedOption<T>>) {
  const total = sum(options.map((option) => option.weight));
  let cursor = random() * total;

  for (const option of options) {
    cursor -= option.weight;

    if (cursor <= 0) {
      return option.value;
    }
  }

  return options.at(-1)!.value;
}

function pad(value: number, width = 2) {
  return String(value).padStart(width, "0");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dateForGameIndex(index: number) {
  const season = 2024 + Math.floor(index / 12);
  const weekInSeason = index % 12;
  const date = new Date(Date.UTC(season, 8, 5 + weekInSeason * 7));

  return date.toISOString().slice(0, 10);
}

function offsetDate(dateText: string, offsetDays: number) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export const team: Team = {
  id: "mount-olive-football",
  sport: "football",
  name: "Mount Olive Football",
  school: "Mount Olive High School",
  season: "2024-2026 synthetic performance lab",
  classification: "North Jersey Group 4",
  isDemoData: true,
};

const firstNames = [
  "Aiden",
  "Andre",
  "Anthony",
  "Ben",
  "Brady",
  "Caleb",
  "Cameron",
  "Carter",
  "Chase",
  "Christian",
  "Cole",
  "Damon",
  "Daniel",
  "Darius",
  "Declan",
  "Diego",
  "Dylan",
  "Eli",
  "Evan",
  "Gabriel",
  "Grayson",
  "Isaiah",
  "Jack",
  "Jalen",
  "Julian",
  "Kai",
  "Leo",
  "Liam",
  "Logan",
  "Lucas",
  "Marcus",
  "Mateo",
  "Miles",
  "Nate",
  "Nico",
  "Noah",
  "Omar",
  "Owen",
  "Parker",
  "Rafael",
  "Ryan",
  "Samir",
  "Sean",
  "Theo",
  "Tyler",
  "Victor",
  "Wesley",
  "Zach",
];

const lastNames = [
  "Alston",
  "Baker",
  "Bell",
  "Bennett",
  "Brooks",
  "Carter",
  "Chen",
  "Costa",
  "Diaz",
  "Fischer",
  "Flores",
  "Grant",
  "Green",
  "Han",
  "Harris",
  "Hayes",
  "Hernandez",
  "Iyer",
  "Jackson",
  "Johnson",
  "King",
  "Klein",
  "Lee",
  "Lewis",
  "Lopez",
  "Martinez",
  "Miller",
  "Morrison",
  "Nguyen",
  "Patel",
  "Price",
  "Reed",
  "Rinaldi",
  "Rivera",
  "Robinson",
  "Santos",
  "Shah",
  "Stein",
  "Thompson",
  "Torres",
  "Velez",
  "Walker",
  "Watson",
  "Williams",
  "Young",
];

const rosterBlueprint: PositionBlueprint[] = [
  {
    position: "QB",
    count: 4,
    primaryUnit: "offense",
    height: [71, 76],
    weight: [178, 215],
    preferredNumbers: [2, 5, 8, 12, 16, 17],
    archetypes: ["Rhythm passer", "Movement passer", "RPO distributor", "Constraint runner"],
  },
  {
    position: "RB",
    count: 6,
    primaryUnit: "offense",
    height: [67, 72],
    weight: [172, 215],
    preferredNumbers: [1, 4, 20, 21, 22, 24, 26, 28],
    archetypes: ["Explosive early-down runner", "Contact-balance runner", "Screen-game outlet", "Short-yardage finisher"],
  },
  {
    position: "WR",
    count: 11,
    primaryUnit: "offense",
    height: [68, 75],
    weight: [155, 195],
    preferredNumbers: [0, 3, 6, 7, 9, 10, 11, 13, 14, 18, 19, 80, 81, 82],
    archetypes: ["Vertical separator", "Space target", "Slot option runner", "Boundary possession target"],
  },
  {
    position: "TE",
    count: 5,
    primaryUnit: "offense",
    height: [72, 78],
    weight: [205, 245],
    preferredNumbers: [44, 84, 85, 86, 87, 88, 89],
    archetypes: ["Inline efficiency stabilizer", "Seam target", "Wing-move blocker", "Red-zone matchup"],
  },
  {
    position: "OL",
    count: 12,
    primaryUnit: "offense",
    height: [70, 78],
    weight: [225, 305],
    preferredNumbers: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72],
    archetypes: ["Run-game anchor", "Pass-protection communicator", "Pulling guard", "Edge setter"],
  },
  {
    position: "DL",
    count: 9,
    primaryUnit: "defense",
    height: [70, 77],
    weight: [205, 285],
    preferredNumbers: [45, 72, 73, 74, 75, 76, 77, 90, 91, 92, 94, 95, 96, 98],
    archetypes: ["Interior disruption", "Edge contain defender", "Pressure finisher", "Gap-control tackle"],
  },
  {
    position: "LB",
    count: 8,
    primaryUnit: "defense",
    height: [69, 75],
    weight: [185, 230],
    preferredNumbers: [4, 9, 15, 31, 32, 33, 34, 40, 41, 42, 43],
    archetypes: ["Coverage linebacker", "Pressure finisher", "Box trigger", "Run-fit communicator"],
  },
  {
    position: "DB",
    count: 11,
    primaryUnit: "defense",
    height: [67, 74],
    weight: [155, 195],
    preferredNumbers: [1, 3, 6, 7, 10, 11, 14, 18, 23, 25, 27, 29, 30],
    archetypes: ["Man-match corner", "Range safety", "Nickel pressure defender", "Run-support safety"],
  },
  {
    position: "K/P",
    count: 2,
    primaryUnit: "special-teams",
    height: [68, 74],
    weight: [155, 190],
    preferredNumbers: [35, 36, 37, 38, 39, 49],
    archetypes: ["Field-position specialist", "Kickoff hang-time specialist"],
  },
  {
    position: "ATH",
    count: 4,
    primaryUnit: "two-way",
    height: [69, 74],
    weight: [170, 205],
    preferredNumbers: [2, 5, 13, 15, 17, 21, 23],
    archetypes: ["Two-way leverage player", "Motion-package weapon", "Nickel and slot utility", "Special-teams stressor"],
  },
];

function statusForRosterSpot(index: number): AvailabilityStatus {
  if (index % 29 === 0) {
    return "questionable";
  }

  if (index % 17 === 0) {
    return "limited";
  }

  if (index % 43 === 0) {
    return "out";
  }

  return weighted<AvailabilityStatus>([
    { value: "available", weight: 82 },
    { value: "limited", weight: 9 },
    { value: "questionable", weight: 6 },
    { value: "out", weight: 3 },
  ]);
}

function classYearFor(index: number) {
  return ["Senior", "Junior", "Sophomore", "Freshman"][(index * 7) % 4]!;
}

function generatePlayers() {
  const usedNumbers = new Set<number>();
  const output: Player[] = [];

  rosterBlueprint.forEach((blueprint) => {
    for (let depth = 0; depth < blueprint.count; depth += 1) {
      const globalIndex = output.length;
      const preferred = blueprint.preferredNumbers.find((number) => !usedNumbers.has(number));
      const fallback = Array.from({ length: 100 }, (_, number) => number).find((number) => !usedNumbers.has(number));
      const number = preferred ?? fallback ?? globalIndex;
      usedNumbers.add(number);

      const first = firstNames[(globalIndex * 5 + depth * 3) % firstNames.length]!;
      const last = lastNames[(globalIndex * 7 + depth * 11) % lastNames.length]!;
      const heightInches = randomInt(blueprint.height[0], blueprint.height[1]);
      const weightPounds = randomInt(blueprint.weight[0], blueprint.weight[1]);

      output.push({
        id: `p-${slug(blueprint.position)}-${pad(number, 2)}-${pad(depth + 1)}`,
        sport: "football",
        name: `${first} ${last}`,
        number,
        position: blueprint.position,
        classYear: classYearFor(globalIndex),
        heightInches,
        weightPounds,
        primaryUnit: blueprint.primaryUnit,
        status: statusForRosterSpot(globalIndex),
        archetype: choose(blueprint.archetypes),
      });
    }
  });

  return output;
}

export const players: Player[] = generatePlayers();

function playersAt(position: string) {
  return players.filter((player) => player.position === position && player.status !== "out");
}

function firstPlayerAt(position: string) {
  return playersAt(position)[0] ?? players.find((player) => player.position === position)!;
}

function choosePlayerFrom(positionWeights: Array<WeightedOption<string>>) {
  const position = weighted(positionWeights);
  const candidates = playersAt(position);

  if (candidates.length === 0) {
    return undefined;
  }

  const depthWeighted = candidates.map((player, index) => ({
    value: player.id,
    weight: Math.max(2, 18 - index * 2),
  }));

  return weighted(depthWeighted);
}

const opponentNames = [
  "Randolph",
  "Roxbury",
  "Morris Hills",
  "West Morris",
  "Chatham",
  "Sparta",
  "Delbarton",
  "Montville",
  "Mendham",
  "Parsippany Hills",
  "Morristown",
  "Jefferson",
  "Pequannock",
  "Vernon",
  "Lenape Valley",
  "Hackettstown",
  "Madison",
  "Kinnelon",
  "Pope John",
  "Lakeland",
  "Wayne Valley",
  "Wayne Hills",
  "River Dell",
  "Ramapo",
  "Old Tappan",
  "Northern Highlands",
  "Morris Knolls",
  "Summit",
  "Cranford",
  "Warren Hills",
  "North Hunterdon",
  "Phillipsburg",
  "Ridgewood",
  "Passaic Valley",
  "Livingston",
  "Columbia",
  "Nutley",
  "Millburn",
  "Watchung Hills",
  "Somerville",
  "Bernards",
  "High Point",
];

const opponentStyles = [
  {
    style: "Condensed formations with play-action shots",
    risk: "High pressure on third-and-medium",
  },
  {
    style: "Tempo spread with RPO screens",
    risk: "Explosive if missed tackles stack early",
  },
  {
    style: "Power run with heavy boxes",
    risk: "Low variance until they create short fields",
  },
  {
    style: "Option run with field-position control",
    risk: "Possession drain and fourth-down aggression",
  },
  {
    style: "Spread passing with simulated pressures",
    risk: "Can create fast negative scripts",
  },
  {
    style: "Balanced 11 personnel and quarters defense",
    risk: "Good red-zone constraint coverage",
  },
  {
    style: "Wing-T motion and edge pressure",
    risk: "Eye discipline and perimeter force stress",
  },
  {
    style: "Multiple-front defense with pressure rotations",
    risk: "Protection ID and hot-answer stress",
  },
];

function generateOpponents(): Opponent[] {
  return opponentNames.map((name, index) => {
    const style = opponentStyles[index % opponentStyles.length]!;
    const paceNoise = Math.sin(index * 1.7) * 8 + randomNormal(0, 5);
    const pressureNoise = Math.cos(index * 1.23) * 9 + randomNormal(0, 6);
    const strengthBase = 0.36 + (index % 9) * 0.045 + randomNormal(0, 0.055);
    const strengthRating = round(clamp(strengthBase, 0.24, 0.88), 2);
    const wins = clamp(Math.round(2 + strengthRating * 8 + randomNormal(0, 1.4)), 0, 10);
    const losses = clamp(Math.round(9 - wins + randomNormal(0, 1.1)), 0, 9);

    return {
      id: `opp-${slug(name)}`,
      sport: "football",
      name,
      record: `${wins}-${losses}`,
      style: style.style,
      offensivePace: Math.round(clamp(55 + paceNoise + strengthRating * 18, 42, 88)),
      defensivePressure: Math.round(clamp(48 + pressureNoise + strengthRating * 26, 31, 91)),
      strengthRating,
      riskProfile: style.risk,
    };
  });
}

export const opponents: Opponent[] = generateOpponents();

function driveResultWeights(
  offense: OffenseSide,
  opponent: Opponent,
  teamForm: number,
  startYardLine: number,
  scoreDiff: number,
  quarter: number
): Array<WeightedOption<DriveResult>> {
  const opponentPower = opponent.strengthRating + opponent.offensivePace / 260;
  const mountOlivePower = teamForm + 0.24 - opponent.defensivePressure / 260;
  const rawPower = offense === "mount-olive" ? mountOlivePower : opponentPower - teamForm * 0.16;
  const scriptBoost =
    offense === "mount-olive"
      ? scoreDiff < -10
        ? 0.09
        : scoreDiff > 13
          ? -0.05
          : 0
      : scoreDiff > 10
        ? 0.08
        : scoreDiff < -13
          ? -0.05
          : 0;
  const fieldBoost = (startYardLine - 25) / 100;
  const pressureMistake = offense === "mount-olive" ? opponent.defensivePressure / 95 : 0.55;
  const power = clamp(rawPower + scriptBoost + fieldBoost, 0.12, 0.92);
  const lateHalf = quarter === 2 || quarter === 4;

  return [
    { value: "touchdown", weight: clamp(13 + power * 36 + fieldBoost * 20, 6, 52) },
    { value: "field-goal", weight: clamp(10 + power * 15 + fieldBoost * 18, 4, 31) },
    { value: "punt", weight: clamp(34 - power * 20 - fieldBoost * 12, 7, 42) },
    { value: "turnover", weight: clamp(6 + pressureMistake * 6 - power * 3, 3, 16) },
    { value: "downs", weight: clamp(6 + (1 - power) * 8 + fieldBoost * 5, 3, 18) },
    { value: "end-half", weight: lateHalf ? 3 : 0.7 },
  ];
}

function yardsForDrive(result: DriveResult, startYardLine: number, drivePower: number) {
  if (result === "touchdown") {
    return 100 - startYardLine;
  }

  if (result === "field-goal") {
    const end = Math.round(clamp(randomNormal(79 + drivePower * 8, 8), startYardLine + 18, 96));
    return end - startYardLine;
  }

  if (result === "punt") {
    return Math.round(clamp(randomNormal(23 + drivePower * 18, 17), -9, 58));
  }

  if (result === "turnover") {
    return Math.round(clamp(randomNormal(18 + drivePower * 12, 16), -12, 67));
  }

  if (result === "downs") {
    return Math.round(clamp(randomNormal(31 + drivePower * 16, 13), 4, 73));
  }

  return Math.round(clamp(randomNormal(11 + drivePower * 8, 10), -5, 40));
}

function epaForDrive(result: DriveResult, yards: number, startYardLine: number, drivePower: number) {
  const resultValue: Record<DriveResult, number> = {
    touchdown: 4.8,
    "field-goal": 2.1,
    punt: -0.75,
    turnover: -3.4,
    downs: -2.15,
    "end-half": -0.35,
  };

  return round(
    clamp(
      resultValue[result] + yards * 0.028 + (startYardLine - 25) * 0.018 + drivePower * 0.7 + randomNormal(0, 0.8),
      -6.6,
      6.9
    ),
    2
  );
}

function playTypeForDrive(drive: Drive, opponent: Opponent, index: number, down: number, distance: number): PlayType {
  const isFinalPlay = index === drive.playCount - 1;

  if (isFinalPlay && drive.result === "field-goal") {
    return "field-goal";
  }

  if (isFinalPlay && drive.result === "punt") {
    return "punt";
  }

  if (random() < 0.038) {
    return "penalty";
  }

  if (drive.offense === "mount-olive") {
    if (down >= 3 && distance >= 7) {
      return weighted<PlayType>([
        { value: "pass", weight: 66 },
        { value: "screen", weight: 19 },
        { value: "run", weight: 15 },
      ]);
    }

    if (drive.startYardLine >= 80 || drive.quarter >= 4) {
      return weighted<PlayType>([
        { value: "run", weight: 42 },
        { value: "pass", weight: 42 },
        { value: "screen", weight: 16 },
      ]);
    }

    return weighted<PlayType>([
      { value: "run", weight: 45 },
      { value: "pass", weight: 42 },
      { value: "screen", weight: 13 },
    ]);
  }

  if (opponent.offensivePace > 72) {
    return weighted<PlayType>([
      { value: "pass", weight: 50 },
      { value: "screen", weight: 23 },
      { value: "run", weight: 27 },
    ]);
  }

  return weighted<PlayType>([
    { value: "run", weight: 48 },
    { value: "pass", weight: 38 },
    { value: "screen", weight: 14 },
  ]);
}

function playerForPlay(playType: PlayType) {
  if (playType === "run") {
    return choosePlayerFrom([
      { value: "RB", weight: 58 },
      { value: "QB", weight: 11 },
      { value: "ATH", weight: 17 },
      { value: "WR", weight: 14 },
    ]);
  }

  if (playType === "pass") {
    return choosePlayerFrom([
      { value: "WR", weight: 56 },
      { value: "TE", weight: 20 },
      { value: "RB", weight: 12 },
      { value: "ATH", weight: 12 },
    ]);
  }

  if (playType === "screen") {
    return choosePlayerFrom([
      { value: "RB", weight: 38 },
      { value: "WR", weight: 42 },
      { value: "ATH", weight: 15 },
      { value: "TE", weight: 5 },
    ]);
  }

  if (playType === "field-goal" || playType === "punt") {
    return firstPlayerAt("K/P").id;
  }

  return undefined;
}

function generatePlaysForDrive(drive: Drive, opponent: Opponent) {
  const output: Play[] = [];
  let accumulatedYards = 0;
  let down: 1 | 2 | 3 | 4 = 1;
  let distance = randomInt(8, 10);

  for (let index = 0; index < drive.playCount; index += 1) {
    const isFinalPlay = index === drive.playCount - 1;
    const yardLine = Math.round(clamp(drive.startYardLine + accumulatedYards, 1, 99));
    const playType = playTypeForDrive(drive, opponent, index, down, distance);
    const remainingPlays = Math.max(1, drive.playCount - index);
    const remainingYards = drive.yards - accumulatedYards;
    const baseYards = remainingYards / remainingPlays;
    const typeAdjustment =
      playType === "pass" ? 2.4 : playType === "screen" ? 0.7 : playType === "run" ? -0.4 : 0;
    let yardsGained = Math.round(clamp(randomNormal(baseYards + typeAdjustment, 6.6), -10, 39));

    if (playType === "penalty") {
      yardsGained = weighted([
        { value: -15, weight: 11 },
        { value: -10, weight: 32 },
        { value: -5, weight: 45 },
        { value: 5, weight: 7 },
        { value: 10, weight: 5 },
      ]);
    }

    if (isFinalPlay) {
      if (drive.result === "touchdown") {
        yardsGained = Math.max(1, 100 - yardLine);
      } else if (drive.result === "field-goal" || drive.result === "punt") {
        yardsGained = 0;
      } else if (drive.result === "turnover") {
        yardsGained = Math.round(clamp(randomNormal(1, 8), -13, 24));
      } else if (drive.result === "downs") {
        yardsGained = Math.max(0, Math.min(distance - 1, Math.round(randomNormal(distance - 2, 3))));
      }
    }

    const explosive = playType === "pass" || playType === "screen" ? yardsGained >= 16 : yardsGained >= 11;
    const turnover = drive.result === "turnover" && isFinalPlay;
    const conversion = yardsGained >= distance || yardLine + yardsGained >= 100;
    const success =
      playType === "field-goal"
        ? drive.result === "field-goal"
        : playType === "punt"
          ? false
          : down === 1
            ? yardsGained >= 4
            : down === 2
              ? yardsGained >= Math.ceil(distance * 0.55)
              : conversion;
    const playEpa = round(
      clamp(
        drive.epa / drive.playCount +
          (success ? 0.16 : -0.19) +
          (explosive ? 0.78 : 0) +
          (turnover ? -2.1 : 0) +
          (playType === "penalty" ? -0.28 : 0) +
          randomNormal(0, 0.24),
        -6.8,
        6.8
      ),
      2
    );

    output.push({
      id: `${drive.id}-play-${pad(index + 1)}`,
      gameId: drive.gameId,
      driveId: drive.id,
      offense: drive.offense,
      quarter: drive.quarter,
      down,
      distance,
      yardLine,
      playType,
      yardsGained,
      epa: playEpa,
      success,
      explosive,
      turnover,
      redZone: yardLine >= 80,
      playerId:
        drive.offense === "mount-olive" && playType !== "penalty" ? playerForPlay(playType) : undefined,
      scoreDiff: drive.startScoreDiff,
    });

    accumulatedYards += yardsGained;

    if (conversion) {
      down = 1;
      distance = yardLine + yardsGained >= 90 ? Math.max(1, 100 - (yardLine + yardsGained)) : randomInt(8, 10);
    } else {
      down = down === 4 ? 1 : ((down + 1) as 1 | 2 | 3 | 4);
      distance = Math.max(1, distance - yardsGained);
    }
  }

  return output;
}

function gameNotes(result: GameResult, margin: number, opponent: Opponent, stat: TeamGameStat) {
  if (result === "W" && stat.offensiveEpa > 10) {
    return `Explosive offensive EPA carried the matchup despite ${opponent.name}'s ${opponent.style.toLowerCase()}.`;
  }

  if (result === "W" && stat.takeaways > stat.turnovers) {
    return `Positive turnover value and field position turned a tight ${opponent.name} game toward Mount Olive.`;
  }

  if (result === "L" && stat.defensiveEpaAllowed > 9) {
    return `${opponent.name} created too many high-value possessions; defensive EPA allowed was the main separator.`;
  }

  if (result === "L" && margin > -8) {
    return `One-score loss with usable efficiency signals. Red-zone and fourth-down choices remain the review focus.`;
  }

  return `Noisy but useful sample against ${opponent.name}; success rate and pressure answers drove most of the postgame model explanation.`;
}

function simulateGame(index: number): GameSimulation {
  const gameId = `game-${pad(index + 1, 3)}`;
  const opponent = opponents[(index * 7 + 3) % opponents.length]!;
  const location = (["home", "away", "neutral"] as const)[index % 3]!;
  const homeAdjustment = location === "home" ? 0.04 : location === "away" ? -0.03 : 0;
  const seasonGrowth = Math.floor(index / 12) * 0.035;
  const teamForm = clamp(0.52 + seasonGrowth + Math.sin(index * 0.62) * 0.055 + randomNormal(0, 0.035), 0.38, 0.78);
  const startWinProbability = round(
    clamp(sigmoid((teamForm - opponent.strengthRating + homeAdjustment) * 4.1 + randomNormal(0, 0.28)), 0.08, 0.92),
    2
  );
  const totalDrives = Math.round(clamp(randomNormal(22 + (opponent.offensivePace - 60) / 7, 2.8), 18, 30));
  const firstOffense: OffenseSide = random() > 0.48 ? "mount-olive" : "opponent";
  const gameDrives: Drive[] = [];
  const gamePlays: Play[] = [];
  let scoreFor = 0;
  let scoreAgainst = 0;

  for (let driveIndex = 0; driveIndex < totalDrives; driveIndex += 1) {
    const offense: OffenseSide =
      driveIndex % 2 === 0 ? firstOffense : firstOffense === "mount-olive" ? "opponent" : "mount-olive";
    const quarter = Math.min(4, Math.floor((driveIndex / totalDrives) * 4) + 1);
    const scoreDiff = scoreFor - scoreAgainst;
    const fieldPositionNoise = offense === "mount-olive" ? teamForm * 4 : opponent.strengthRating * 5;
    const startYardLine = Math.round(clamp(randomNormal(29 + fieldPositionNoise, 10.5), 4, 49));
    const drivePower =
      offense === "mount-olive"
        ? clamp(teamForm + 0.18 - opponent.defensivePressure / 300 + randomNormal(0, 0.08), 0.12, 0.92)
        : clamp(opponent.strengthRating + opponent.offensivePace / 360 - teamForm * 0.18 + randomNormal(0, 0.08), 0.12, 0.92);
    const result = weighted(driveResultWeights(offense, opponent, teamForm, startYardLine, scoreDiff, quarter));
    const yards = yardsForDrive(result, startYardLine, drivePower);
    const endYardLine = Math.round(clamp(startYardLine + yards, 1, 100));
    const playCount = Math.round(
      clamp(
        result === "touchdown"
          ? randomNormal(7.5, 2.2)
          : result === "field-goal"
            ? randomNormal(7.1, 2)
            : result === "punt"
              ? randomNormal(5.1, 1.7)
              : randomNormal(5.9, 2.1),
        3,
        13
      )
    );
    const drive: Drive = {
      id: `${gameId}-drive-${pad(driveIndex + 1)}`,
      gameId,
      offense,
      quarter,
      startYardLine,
      endYardLine,
      playCount,
      yards,
      result,
      epa: epaForDrive(result, yards, startYardLine, drivePower),
      startScoreDiff: scoreDiff,
    };

    if (result === "touchdown") {
      if (offense === "mount-olive") {
        scoreFor += 7;
      } else {
        scoreAgainst += 7;
      }
    }

    if (result === "field-goal") {
      if (offense === "mount-olive") {
        scoreFor += 3;
      } else {
        scoreAgainst += 3;
      }
    }

    gameDrives.push(drive);
    gamePlays.push(...generatePlaysForDrive(drive, opponent));
  }

  if (scoreFor === scoreAgainst) {
    if (teamForm + homeAdjustment >= opponent.strengthRating) {
      scoreFor += 3;
    } else {
      scoreAgainst += 3;
    }
  }

  const result: Game["result"] = scoreFor > scoreAgainst ? "W" : "L";
  const margin = scoreFor - scoreAgainst;
  const mountOlivePlays = gamePlays.filter(
    (play) => play.offense === "mount-olive" && play.playType !== "punt" && play.playType !== "field-goal"
  );
  const opponentPlays = gamePlays.filter(
    (play) => play.offense === "opponent" && play.playType !== "punt" && play.playType !== "field-goal"
  );
  const mountOliveDrives = gameDrives.filter((drive) => drive.offense === "mount-olive");
  const opponentDrives = gameDrives.filter((drive) => drive.offense === "opponent");
  const thirdDownPlays = mountOlivePlays.filter((play) => play.down === 3);
  const redZoneDrives = mountOliveDrives.filter((drive) => drive.startYardLine >= 80 || drive.endYardLine >= 80);
  const stat: TeamGameStat = {
    id: `tgs-${pad(index + 1, 3)}`,
    gameId,
    plays: mountOlivePlays.length,
    yards: sum(mountOlivePlays.map((play) => play.yardsGained)),
    offensiveEpa: round(sum(mountOlivePlays.map((play) => play.epa)), 2),
    defensiveEpaAllowed: round(sum(opponentPlays.map((play) => play.epa)), 2),
    successRate: round(ratio(mountOlivePlays.filter((play) => play.success).length, mountOlivePlays.length), 3),
    explosivePlays: mountOlivePlays.filter((play) => play.explosive).length,
    thirdDownAttempts: thirdDownPlays.length,
    thirdDownConversions: thirdDownPlays.filter((play) => play.yardsGained >= play.distance).length,
    redZoneTrips: redZoneDrives.length,
    redZoneTouchdowns: redZoneDrives.filter((drive) => drive.result === "touchdown").length,
    turnovers: mountOliveDrives.filter((drive) => drive.result === "turnover").length,
    takeaways: opponentDrives.filter((drive) => drive.result === "turnover").length,
    penalties: mountOlivePlays.filter((play) => play.playType === "penalty").length,
    penaltyYards: Math.abs(sum(mountOlivePlays.filter((play) => play.playType === "penalty").map((play) => play.yardsGained))),
    averageStartingFieldPosition: round(mean(mountOliveDrives.map((drive) => drive.startYardLine)), 1),
  };
  const finalWinProbability = round(
    result === "W"
      ? clamp(0.64 + margin * 0.014 + stat.offensiveEpa * 0.004 + randomNormal(0, 0.035), 0.52, 0.99)
      : clamp(0.36 + margin * 0.014 - stat.defensiveEpaAllowed * 0.003 + randomNormal(0, 0.035), 0.02, 0.48),
    2
  );

  return {
    game: {
      id: gameId,
      sport: "football",
      date: dateForGameIndex(index),
      week: index + 1,
      opponentId: opponent.id,
      location,
      scoreFor,
      scoreAgainst,
      result,
      winProbabilityStart: startWinProbability,
      winProbabilityEnd: finalWinProbability,
      notes: gameNotes(result, margin, opponent, stat),
    },
    stat,
    drives: gameDrives,
    plays: gamePlays,
  };
}

const simulations = Array.from({ length: GAME_COUNT }, (_, index) => simulateGame(index));

export const games: Game[] = simulations.map((simulation) => simulation.game);
export const teamGameStats: TeamGameStat[] = simulations.map((simulation) => simulation.stat);
export const drives: Drive[] = simulations.flatMap((simulation) => simulation.drives);
export const plays: Play[] = simulations.flatMap((simulation) => simulation.plays);

function depthIndex(player: Player) {
  return players.filter((candidate) => candidate.position === player.position).findIndex((candidate) => candidate.id === player.id);
}

function statusAvailability(player: Player, gameIndex: number) {
  const recurringDip = (gameIndex + player.number) % 13 === 0 ? -0.28 : 0;

  if (player.status === "out") {
    return clamp(0.12 + recurringDip, 0, 0.3);
  }

  if (player.status === "questionable") {
    return clamp(0.62 + recurringDip + randomNormal(0, 0.08), 0.25, 0.82);
  }

  if (player.status === "limited") {
    return clamp(0.72 + recurringDip + randomNormal(0, 0.07), 0.36, 0.9);
  }

  return clamp(0.94 + recurringDip + randomNormal(0, 0.05), 0.62, 1);
}

function snapBaseline(player: Player) {
  const baseByPosition: Record<string, number> = {
    QB: 64,
    RB: 42,
    WR: 52,
    TE: 46,
    OL: 67,
    DL: 49,
    LB: 61,
    DB: 63,
    "K/P": 13,
    ATH: 36,
  };
  const depth = depthIndex(player);
  const multiplier =
    player.position === "OL"
      ? depth < 5
        ? 1
        : depth < 8
          ? 0.34
          : 0.16
      : player.position === "WR" || player.position === "DB" || player.position === "DL"
        ? depth < 4
          ? 0.95
          : depth < 7
            ? 0.52
            : 0.25
        : depth === 0
          ? 1
          : depth === 1
            ? 0.42
            : 0.18;

  return (baseByPosition[player.position] ?? 32) * multiplier;
}

function playerGameKey(gameId: string, playerId: string) {
  return `${gameId}::${playerId}`;
}

function generatePlayerGameStats(): PlayerGameStat[] {
  const playsByPlayerGame = new Map<string, Play[]>();

  plays.forEach((play) => {
    if (!play.playerId) {
      return;
    }

    const key = playerGameKey(play.gameId, play.playerId);
    playsByPlayerGame.set(key, [...(playsByPlayerGame.get(key) ?? []), play]);
  });

  return games.flatMap((game, gameIndex) => {
    const stat = teamGameStats.find((item) => item.gameId === game.id)!;
    const gamePlays = plays.filter((play) => play.gameId === game.id);
    const mountOlivePlays = gamePlays.filter((play) => play.offense === "mount-olive");
    const opponentPlayCount = gamePlays.filter((play) => play.offense === "opponent").length;
    const passLikeYards = sum(
      mountOlivePlays
        .filter((play) => play.playType === "pass" || play.playType === "screen")
        .map((play) => Math.max(0, play.yardsGained))
    );
    const teamNet = stat.offensiveEpa - stat.defensiveEpaAllowed;

    return players.map((player) => {
      const depth = depthIndex(player);
      const availability = statusAvailability(player, gameIndex);
      const snapWave = 1 + Math.sin((gameIndex + player.number) * 0.53) * 0.08;
      const snaps = Math.max(0, Math.round(snapBaseline(player) * availability * snapWave + randomNormal(0, 3)));
      const directPlays = playsByPlayerGame.get(playerGameKey(game.id, player.id)) ?? [];
      const directYards = sum(directPlays.map((play) => Math.max(-5, play.yardsGained)));
      const qbShare = player.position === "QB" && depth === 0 ? 0.72 : player.position === "QB" && depth === 1 ? 0.18 : 0;
      const qbOpportunities = Math.round(qbShare * mountOlivePlays.filter((play) => play.playType === "pass").length);
      const offensiveRoleUsage =
        player.position === "OL"
          ? Math.round(snaps * 0.09)
          : player.position === "K/P"
            ? directPlays.length
            : directPlays.length + qbOpportunities;
      const opportunities = Math.max(0, offensiveRoleUsage);
      const yards =
        player.position === "QB"
          ? Math.round(qbShare * passLikeYards + directYards * 0.75)
          : Math.max(0, Math.round(directYards));
      const defensiveRole = player.primaryUnit === "defense" || player.primaryUnit === "two-way";
      const tackles = defensiveRole
        ? Math.max(
            0,
            Math.round(
              opponentPlayCount *
                (player.position === "LB" ? 0.085 : player.position === "DB" ? 0.052 : player.position === "DL" ? 0.041 : 0.026) *
                availability *
                (depth < 3 ? 1 : 0.54) +
                randomNormal(0, 1.2)
            )
          )
        : 0;
      const disruptionPlays = defensiveRole
        ? Math.max(
            0,
            Math.round(
              opponentPlayCount *
                (player.position === "DL" ? 0.032 : player.position === "LB" ? 0.023 : player.position === "DB" ? 0.012 : 0.008) *
                availability *
                (depth < 4 ? 1 : 0.46) +
                randomNormal(0, 0.8)
            )
          )
        : 0;
      const touchdowns =
        opportunities > 0
          ? Math.max(0, Math.round((yards / 92 + opportunities / 18 + randomNormal(-0.35, 0.5)) * 0.58))
          : 0;
      const offensiveEpa = sum(directPlays.map((play) => play.epa)) + (player.position === "QB" ? stat.offensiveEpa * qbShare * 0.28 : 0);
      const defensiveEpa = defensiveRole ? tackles * 0.12 + disruptionPlays * 0.42 - stat.defensiveEpaAllowed * 0.018 : 0;
      const epaContribution = round(clamp(offensiveEpa + defensiveEpa + randomNormal(0, 0.35), -4.4, 6.8), 2);
      const assignmentGrade = round(
        clamp(70 + epaContribution * 2.8 + availability * 8 + snaps / 18 + randomNormal(0, 3.4), 48, 98),
        1
      );

      return {
        id: `${game.id}-${player.id}`,
        gameId: game.id,
        playerId: player.id,
        snaps,
        opportunities,
        yards,
        touchdowns,
        tackles,
        disruptionPlays,
        epaContribution,
        onFieldNetEpa: round(teamNet + epaContribution * 0.85 + randomNormal(0, 2.1), 2),
        assignmentGrade,
      };
    });
  });
}

export const playerGameStats: PlayerGameStat[] = generatePlayerGameStats();

const noteCategories = [
  "Protection risk",
  "Coverage leverage",
  "Tempo constraint",
  "Explosive prevention",
  "Red-zone tendency",
  "Third-down plan",
  "Player usage",
  "Practice carryover",
];

function generateScoutingNotes(): ScoutingNote[] {
  const notes: ScoutingNote[] = [];

  opponents.forEach((opponent, index) => {
    notes.push({
      id: `note-opp-${pad(index + 1, 3)}-pressure`,
      sport: "football",
      opponentId: opponent.id,
      category: "Pressure profile",
      note: `${opponent.name} blends ${opponent.style.toLowerCase()} with a ${opponent.defensivePressure}/100 pressure marker. Motion, quick-game answers, and protection ID should be installed early in the week.`,
      confidence: round(clamp(0.52 + opponent.strengthRating * 0.34 + randomNormal(0, 0.04), 0.46, 0.88), 2),
    });
    notes.push({
      id: `note-opp-${pad(index + 1, 3)}-pace`,
      sport: "football",
      opponentId: opponent.id,
      category: "Pace tendency",
      note: `Pace index ${opponent.offensivePace} suggests ${
        opponent.offensivePace > 72 ? "defensive communication and rotation depth" : "possession discipline and early-down leverage"
      } matter more than raw yardage allowed.`,
      confidence: round(clamp(0.49 + randomNormal(0.13, 0.06), 0.42, 0.83), 2),
    });
  });

  players
    .filter((player) => player.primaryUnit !== "special-teams")
    .slice(0, 54)
    .forEach((player, index) => {
      notes.push({
        id: `note-player-${pad(index + 1, 3)}`,
        sport: "football",
        playerId: player.id,
        category: choose(noteCategories),
        note: `${player.name} profiles as a ${player.archetype.toLowerCase()}. Current synthetic trend suggests ${
          player.primaryUnit === "defense" ? "package-specific usage against tempo and condensed sets" : "workload tuned by down, distance, and field zone"
        }.`,
        confidence: round(clamp(0.48 + random() * 0.34, 0.48, 0.86), 2),
      });
    });

  games.forEach((game, index) => {
    notes.push({
      id: `note-game-${pad(index + 1, 3)}`,
      sport: "football",
      gameId: game.id,
      category: "Postgame review",
      note: game.notes,
      confidence: round(clamp(0.54 + Math.abs(game.scoreFor - game.scoreAgainst) / 70 + randomNormal(0, 0.05), 0.48, 0.89), 2),
    });
  });

  return notes;
}

export const scoutingNotes: ScoutingNote[] = generateScoutingNotes();

const practicePeriods = [
  "Inside Run",
  "Third Down",
  "Red Zone",
  "Two-Minute",
  "Screen Answers",
  "Pass Protection",
  "Coverage Fits",
  "Special Teams",
  "Scout Offense",
  "Open-Field Tackling",
  "Goal Line",
  "Turnover Circuit",
];

const practiceFocus = [
  "Gap-scheme fits versus odd front",
  "Protection versus simulated pressure",
  "Compressed-field route spacing",
  "Tempo communication and substitution",
  "Perimeter force and crack replace",
  "Motion identification and leverage checks",
  "Run-pass conflict discipline",
  "Kickoff lane integrity",
  "Boundary shot prevention",
  "Fourth-down decision situations",
  "Backside pursuit angles",
  "Ball-security response after contact",
];

function generatePracticeRecords(): PracticeRecord[] {
  return games.flatMap((game, gameIndex) =>
    Array.from({ length: 4 }, (_, periodIndex) => {
      const period = practicePeriods[(gameIndex + periodIndex * 3) % practicePeriods.length]!;
      const focus = practiceFocus[(gameIndex * 2 + periodIndex * 5) % practiceFocus.length]!;
      const score = round(
        clamp(72 + (teamGameStats[gameIndex]?.successRate ?? 0.43) * 22 + randomNormal(0, 7), 55, 96),
        1
      );

      return {
        id: `practice-${pad(gameIndex + 1, 3)}-${pad(periodIndex + 1)}`,
        sport: "football",
        date: offsetDate(game.date, -4 + periodIndex),
        period,
        focus,
        executionScore: score,
        notes:
          score >= 85
            ? "First group translated the scout look into clean, repeatable answers."
            : score >= 74
              ? "Usable period with a few leverage and communication corrections for film."
              : "Install needs another walk-through and tighter assignment confirmation.",
      };
    })
  );
}

export const practiceRecords: PracticeRecord[] = generatePracticeRecords();

function generateAvailabilityNotes(): AvailabilityNote[] {
  return players.flatMap((player, playerIndex) => {
    const noteCount = player.status === "available" ? 2 : 4;

    return Array.from({ length: noteCount }, (_, noteIndex) => {
      const game = games[(playerIndex * 3 + noteIndex * 7) % games.length]!;
      const status =
        noteIndex === noteCount - 1
          ? player.status
          : weighted<AvailabilityStatus>([
              { value: "available", weight: player.status === "available" ? 80 : 38 },
              { value: "limited", weight: 26 },
              { value: "questionable", weight: 12 },
              { value: "out", weight: player.status === "out" ? 18 : 3 },
            ]);

      return {
        id: `availability-${pad(playerIndex + 1, 3)}-${pad(noteIndex + 1)}`,
        playerId: player.id,
        date: offsetDate(game.date, -2 + noteIndex),
        status,
        note:
          status === "available"
            ? "Full participant with workload inside expected weekly band."
            : status === "limited"
              ? "Managed workload; available for package-specific reps and controlled volume."
              : status === "questionable"
                ? "Practice output below baseline; staff should confirm role before kickoff."
                : "Held out of contact periods and removed from active weekly projection.",
      };
    });
  });
}

export const availabilityNotes: AvailabilityNote[] = generateAvailabilityNotes();

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
  generatedAt: "2026-07-08T11:15:00-04:00",
};
