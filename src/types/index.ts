export type SportKey = "football" | "flag-football" | "basketball" | "hockey" | "tennis" | "robotics";

export type Unit = "offense" | "defense" | "special-teams" | "two-way";

export type GameResult = "W" | "L";

export type PlayType = "run" | "pass" | "screen" | "punt" | "field-goal" | "penalty";

export type DriveResult =
  | "touchdown"
  | "field-goal"
  | "punt"
  | "turnover"
  | "downs"
  | "end-half";

export type AvailabilityStatus = "available" | "limited" | "questionable" | "out";

export interface Team {
  id: string;
  sport: SportKey;
  name: string;
  school: string;
  season: string;
  classification: string;
  isDemoData: boolean;
}

export interface Player {
  id: string;
  sport: SportKey;
  name: string;
  number: number;
  position: string;
  classYear: string;
  heightInches: number;
  weightPounds: number;
  primaryUnit: Unit;
  status: AvailabilityStatus;
  archetype: string;
}

export interface Opponent {
  id: string;
  sport: SportKey;
  name: string;
  record: string;
  style: string;
  offensivePace: number;
  defensivePressure: number;
  strengthRating: number;
  riskProfile: string;
}

export interface Game {
  id: string;
  sport: SportKey;
  date: string;
  week: number;
  opponentId: string;
  location: "home" | "away" | "neutral";
  scoreFor: number;
  scoreAgainst: number;
  result: GameResult;
  winProbabilityStart: number;
  winProbabilityEnd: number;
  notes: string;
}

export interface TeamGameStat {
  id: string;
  gameId: string;
  plays: number;
  yards: number;
  offensiveEpa: number;
  defensiveEpaAllowed: number;
  successRate: number;
  explosivePlays: number;
  thirdDownAttempts: number;
  thirdDownConversions: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  turnovers: number;
  takeaways: number;
  penalties: number;
  penaltyYards: number;
  averageStartingFieldPosition: number;
}

export interface Drive {
  id: string;
  gameId: string;
  offense: "mount-olive" | "opponent";
  quarter: number;
  startYardLine: number;
  endYardLine: number;
  playCount: number;
  yards: number;
  result: DriveResult;
  epa: number;
  startScoreDiff: number;
}

export interface Play {
  id: string;
  gameId: string;
  driveId: string;
  offense: "mount-olive" | "opponent";
  quarter: number;
  down: 1 | 2 | 3 | 4;
  distance: number;
  yardLine: number;
  playType: PlayType;
  yardsGained: number;
  epa: number;
  success: boolean;
  explosive: boolean;
  turnover: boolean;
  redZone: boolean;
  playerId?: string;
  scoreDiff: number;
}

export type VideoSourceType = "upload" | "hudl" | "sideline" | "broadcast" | "demo";

export type VideoProcessingStatus = "ready" | "processing" | "needs-review" | "complete";

export type FilmAutomationLevel = "manual" | "semi-automated" | "computer-vision";

export type FilmClipOutcome =
  | "gain"
  | "negative"
  | "first-down"
  | "touchdown"
  | "turnover"
  | "penalty"
  | "punt"
  | "field-goal";

export type AutomationSource =
  | "scoreboard-ocr"
  | "audio-whistle"
  | "field-marker"
  | "possession-segmentation"
  | "model-fusion";

export type VisionDetectionType =
  | "jersey"
  | "formation"
  | "motion"
  | "ball-carrier"
  | "coverage"
  | "pressure";

export interface VideoAsset {
  id: string;
  sport: SportKey;
  title: string;
  externalUrl?: string;
  gameId?: string;
  opponentId?: string;
  recordedAt: string;
  durationSeconds: number;
  sourceType: VideoSourceType;
  status: VideoProcessingStatus;
  cameraAngle: string;
  resolution: string;
}

export interface FilmClip {
  id: string;
  videoId: string;
  gameId?: string;
  startTime: number;
  endTime: number;
  quarter: number;
  down: 1 | 2 | 3 | 4;
  distance: number;
  yardLine: number;
  playType: PlayType;
  yardsGained: number;
  outcome: FilmClipOutcome;
  playerIds: string[];
  tags: string[];
  notes: string;
  epa: number;
  success: boolean;
  explosive: boolean;
  confidence: number;
  automationLevel: FilmAutomationLevel;
}

export interface FilmAutomationSuggestion {
  id: string;
  clipId: string;
  source: AutomationSource;
  label: string;
  suggestedFields: Partial<
    Pick<
      FilmClip,
      "quarter" | "down" | "distance" | "yardLine" | "playType" | "yardsGained" | "outcome" | "startTime" | "endTime"
    >
  >;
  confidence: number;
  rationale: string;
}

export interface VisionDetection {
  id: string;
  clipId: string;
  type: VisionDetectionType;
  label: string;
  playerId?: string;
  confidence: number;
  frameTime: number;
  x: number;
  y: number;
}

export interface PlayerGameStat {
  id: string;
  gameId: string;
  playerId: string;
  snaps: number;
  opportunities: number;
  yards: number;
  touchdowns: number;
  tackles: number;
  disruptionPlays: number;
  epaContribution: number;
  onFieldNetEpa: number;
  assignmentGrade: number;
}

export interface ScoutingNote {
  id: string;
  sport: SportKey;
  opponentId?: string;
  playerId?: string;
  gameId?: string;
  category: string;
  note: string;
  confidence: number;
}

export interface PracticeRecord {
  id: string;
  sport: SportKey;
  date: string;
  period: string;
  focus: string;
  executionScore: number;
  notes: string;
}

export interface AvailabilityNote {
  id: string;
  playerId: string;
  date: string;
  status: AvailabilityStatus;
  note: string;
}

export interface AnalyticsDataset {
  team: Team;
  players: Player[];
  opponents: Opponent[];
  games: Game[];
  teamGameStats: TeamGameStat[];
  drives: Drive[];
  plays: Play[];
  playerGameStats: PlayerGameStat[];
  scoutingNotes: ScoutingNote[];
  practiceRecords: PracticeRecord[];
  availabilityNotes: AvailabilityNote[];
  generatedAt: string;
}

export interface MetricResult {
  key: string;
  name: string;
  value: number;
  formattedValue: string;
  unit: string;
  formula: string;
  explanation: string;
  confidence: number;
  trend: number[];
  teamAverage: number;
  comparisonAverage: number;
  interpretation: string;
}

export interface DataQualityFlag {
  id: string;
  severity: "info" | "warning" | "critical";
  entity: string;
  message: string;
  recommendation: string;
}

export interface CompletenessScore {
  entity: string;
  score: number;
  presentFields: number;
  totalFields: number;
}

export interface ModelFeatureRow {
  id: string;
  label: string;
  source: "drive" | "game" | "player";
  features: Record<string, number>;
  targets: Record<string, number>;
}
