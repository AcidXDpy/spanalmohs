import type { SportKey } from "@/types";
import type { SportConfig } from "@/lib/sports/types";
import { basketballConfig } from "@/lib/sports/basketball/config";
import { flagFootballConfig } from "@/lib/sports/flag-football/config";
import { footballConfig } from "@/lib/sports/football/config";
import { hockeyConfig } from "@/lib/sports/hockey/config";
import { tennisConfig } from "@/lib/sports/tennis/config";

export const sportConfigs = {
  football: footballConfig,
  "flag-football": flagFootballConfig,
  basketball: basketballConfig,
  hockey: hockeyConfig,
  tennis: tennisConfig,
} satisfies Partial<Record<SportKey, SportConfig>>;

export const supportedSportKeys = Object.keys(sportConfigs) as Array<keyof typeof sportConfigs>;

export function getSportConfig(sport: keyof typeof sportConfigs) {
  return sportConfigs[sport];
}

export function hasSportConfig(sport: SportKey): sport is keyof typeof sportConfigs {
  return sport in sportConfigs;
}

export function listSportConfigs() {
  return supportedSportKeys.map((sport) => sportConfigs[sport]);
}

export interface SportConfigValidationResult {
  sport: SportKey;
  valid: boolean;
  issues: string[];
}

export function validateSportConfig(config: SportConfig): SportConfigValidationResult {
  const issues: string[] = [];
  const metricKeys = new Set(config.metrics.map((metric) => metric.key));

  if (config.metrics.length < 8 || config.metrics.length > 12) {
    issues.push(`${config.displayName} should define 8-12 impact metrics; found ${config.metrics.length}.`);
  }

  for (const weight of config.impact.weights) {
    if (!metricKeys.has(weight.metricKey)) {
      issues.push(`${config.displayName} impact weight references unknown metric "${weight.metricKey}".`);
    }
  }

  if (config.teamStructure.playersPerSide < 1) {
    issues.push(`${config.displayName} must have at least one active player per side.`);
  }

  if (config.surface.length <= 0 || config.surface.width <= 0) {
    issues.push(`${config.displayName} surface dimensions must be positive.`);
  }

  if (config.modeling.defaultFeatures.length === 0) {
    issues.push(`${config.displayName} must define default modeling features.`);
  }

  if (config.modeling.defaultTargets.length === 0) {
    issues.push(`${config.displayName} must define default modeling targets.`);
  }

  return {
    sport: config.sport,
    valid: issues.length === 0,
    issues,
  };
}

export function validateAllSportConfigs() {
  return listSportConfigs().map(validateSportConfig);
}
