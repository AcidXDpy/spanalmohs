import { round } from "@/lib/math";

export interface TrackingPoint {
  frame: number;
  timeSeconds: number;
  x: number;
  y: number;
}

export interface MovementSummary {
  distanceCovered: number;
  averageSpeed: number;
  peakSpeed: number;
  accelerationBursts: number;
}

function distance(left: TrackingPoint, right: TrackingPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export function summarizeTrack(points: TrackingPoint[], accelerationThreshold = 2.4): MovementSummary {
  if (points.length < 2) {
    return {
      distanceCovered: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      accelerationBursts: 0,
    };
  }

  const segments = points.slice(1).map((point, index) => {
    const previous = points[index]!;
    const elapsed = Math.max(point.timeSeconds - previous.timeSeconds, 1 / 60);
    const segmentDistance = distance(previous, point);

    return {
      distance: segmentDistance,
      speed: segmentDistance / elapsed,
    };
  });
  const accelerationBursts = segments.slice(1).filter((segment, index) => {
    const previous = segments[index]!;

    return segment.speed - previous.speed >= accelerationThreshold;
  }).length;
  const duration = Math.max(points.at(-1)!.timeSeconds - points[0]!.timeSeconds, 1 / 60);
  const distanceCovered = segments.reduce((total, segment) => total + segment.distance, 0);

  return {
    distanceCovered: round(distanceCovered, 3),
    averageSpeed: round(distanceCovered / duration, 3),
    peakSpeed: round(Math.max(...segments.map((segment) => segment.speed)), 3),
    accelerationBursts,
  };
}
