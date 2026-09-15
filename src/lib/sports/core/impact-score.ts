import type { SportConfig, SportMetricDefinition } from "@/lib/sports/types";
import { clamp, mean, round, standardDeviation } from "@/lib/math";

export interface SportMetricObservation {
  entityId: string;
  entityLabel?: string;
  role?: string;
  sampleSize: number;
  metrics: Record<string, number>;
  confidence?: number;
}

export interface SportImpactComponent {
  metricKey: string;
  label: string;
  rawValue: number;
  zScore: number;
  weight: number;
  contribution: number;
}

export interface SportImpactScore {
  entityId: string;
  entityLabel: string;
  role?: string;
  compositeZ: number;
  impactScore: number;
  confidence: number;
  components: SportImpactComponent[];
}

function metricDirection(metric: SportMetricDefinition | undefined) {
  return metric?.direction === "lower-is-better" ? -1 : 1;
}

function safeZScore(value: number, population: number[]) {
  const deviation = standardDeviation(population);

  if (deviation === 0) {
    return 0;
  }

  return (value - mean(population)) / deviation;
}

function observationConfidence(config: SportConfig, observation: SportMetricObservation) {
  const sampleConfidence = clamp(Math.sqrt(observation.sampleSize / config.impact.minimumSamples), 0.18, 1);
  const sourceConfidence = observation.confidence ?? 1;

  return round(clamp(sampleConfidence * sourceConfidence, 0.05, 1), 3);
}

export function computeSportImpactScores(
  config: SportConfig,
  observations: SportMetricObservation[]
): SportImpactScore[] {
  const metricByKey = new Map(config.metrics.map((metric) => [metric.key, metric]));
  const usableObservations = observations.filter((observation) => observation.sampleSize > 0);

  return usableObservations
    .map((observation) => {
      const components = config.impact.weights.flatMap((weightDefinition): SportImpactComponent[] => {
        const rawValue = observation.metrics[weightDefinition.metricKey];

        if (!Number.isFinite(rawValue)) {
          return [];
        }

        const population = usableObservations
          .map((item) => item.metrics[weightDefinition.metricKey])
          .filter(Number.isFinite);
        const metric = metricByKey.get(weightDefinition.metricKey);
        const roleMultiplier = observation.role ? (weightDefinition.roleAdjustments?.[observation.role] ?? 1) : 1;
        const weight = weightDefinition.weight * roleMultiplier;
        const zScore = safeZScore(rawValue, population) * metricDirection(metric);

        return [
          {
            metricKey: weightDefinition.metricKey,
            label: metric?.label ?? weightDefinition.metricKey,
            rawValue: round(rawValue, 4),
            zScore: round(zScore, 4),
            weight: round(weight, 4),
            contribution: round(zScore * weight, 4),
          },
        ];
      });
      const totalWeight = Math.max(
        components.reduce((total, component) => total + Math.abs(component.weight), 0),
        1
      );
      const compositeZ = components.reduce((total, component) => total + component.contribution, 0) / totalWeight;
      const confidence = observationConfidence(config, observation);
      const scaledScore =
        config.impact.scoreScale.midpoint +
        compositeZ * config.impact.scoreScale.standardDeviationPoints * confidence;

      return {
        entityId: observation.entityId,
        entityLabel: observation.entityLabel ?? observation.entityId,
        role: observation.role,
        compositeZ: round(compositeZ, 4),
        impactScore: round(clamp(scaledScore, config.impact.scoreScale.min, config.impact.scoreScale.max), 2),
        confidence,
        components,
      };
    })
    .sort((left, right) => right.impactScore - left.impactScore);
}
