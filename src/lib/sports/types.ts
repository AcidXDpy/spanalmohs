import type { SportKey } from "@/types";

export type SurfaceType = "field" | "court" | "rink";

export type SurfaceUnit = "yards" | "feet" | "meters";

export type SportObjectKey = "ball" | "puck";

export type PossessionModelType = "drive" | "possession" | "shift" | "rally";

export type MetricDirection = "higher-is-better" | "lower-is-better";

export type MetricSource =
  | "tracking"
  | "event-tagging"
  | "vision"
  | "box-score"
  | "derived"
  | "manual-review";

export interface SurfaceMarking {
  key: string;
  label: string;
  description: string;
}

export interface SportSurfaceConfig {
  type: SurfaceType;
  unit: SurfaceUnit;
  length: number;
  width: number;
  normalizedCoordinateSystem: "left-to-right" | "team-attacking-direction" | "camera-calibrated";
  markings: SurfaceMarking[];
  zones: SurfaceMarking[];
}

export interface TeamStructureConfig {
  playersPerSide: number;
  maxActivePlayersPerSide: number;
  hasGoalkeeper: boolean;
  supportsSinglesOrDoubles?: boolean;
  roles: string[];
}

export interface PossessionModelConfig {
  type: PossessionModelType;
  primaryObject: SportObjectKey;
  clockMode: "continuous" | "segmented" | "rally";
  possessionChangeEvents: string[];
  terminalEvents: string[];
}

export interface TrackingProfileConfig {
  playerDetectorClasses: string[];
  objectDetectorClasses: string[];
  calibrationAnchors: string[];
  smoothingWindowFrames: number;
  maxTrackGapFrames: number;
  minimumDetectionConfidence: number;
  reIdentificationStrategy: string;
  occlusionStrategy: string;
  notes: string[];
}

export interface MovementPatternDefinition {
  key: string;
  label: string;
  description: string;
  derivedFrom: MetricSource[];
}

export interface SportMetricDefinition {
  key: string;
  label: string;
  description: string;
  unit: string;
  direction: MetricDirection;
  source: MetricSource[];
  minimumSampleSize: number;
}

export interface ImpactWeightDefinition {
  metricKey: string;
  weight: number;
  roleAdjustments?: Record<string, number>;
}

export interface SportImpactConfig {
  compositeName: string;
  scoreScale: {
    min: number;
    max: number;
    midpoint: number;
    standardDeviationPoints: number;
  };
  minimumSamples: number;
  weights: ImpactWeightDefinition[];
  confidenceSignals: string[];
}

export interface ModelingConfig {
  defaultFeatures: string[];
  defaultTargets: string[];
  rowUnit: "play" | "drive" | "possession" | "shift" | "rally" | "player-match";
}

export interface SportConfig {
  sport: SportKey;
  displayName: string;
  formalName: string;
  version: string;
  status: "stable" | "draft";
  extendsSport?: SportKey;
  surface: SportSurfaceConfig;
  teamStructure: TeamStructureConfig;
  possessionModel: PossessionModelConfig;
  tracking: TrackingProfileConfig;
  movementPatterns: MovementPatternDefinition[];
  metrics: SportMetricDefinition[];
  impact: SportImpactConfig;
  modeling: ModelingConfig;
  implementationNotes: string[];
}
