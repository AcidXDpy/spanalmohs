"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clapperboard,
  Eye,
  ExternalLink,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  ScanLine,
  Scissors,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";

import type {
  FilmAutomationSuggestion,
  FilmClip,
  FilmClipOutcome,
  PlayType,
  Player,
  VideoAsset,
  VisionDetection,
} from "@/types";
import { AnalyticsBarChart } from "@/components/charts/analytics-bar-chart";
import { AnalyticsLineChart } from "@/components/charts/analytics-line-chart";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { commonFilmTags, filmPipelineStages, playTypeOptions } from "@/lib/data/sample-film";
import { titleCase } from "@/lib/format";
import { clamp, mean, ratio, round } from "@/lib/math";
import { cn } from "@/lib/utils";

const outcomeOptions: FilmClipOutcome[] = [
  "gain",
  "negative",
  "first-down",
  "touchdown",
  "turnover",
  "penalty",
  "punt",
  "field-goal",
];

const playSimulationDurationMs = 5200;
const playSimulationFrameIntervalMs = 1000 / 24;

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function compactClipLabel(clip: FilmClip) {
  return `${formatClock(clip.startTime)} Q${clip.quarter} ${clip.down}&${clip.distance}`;
}

function labelToTag(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function confidenceTone(confidence: number) {
  if (confidence >= 0.8) {
    return "border-emerald-300/30 text-emerald-200";
  }

  if (confidence >= 0.65) {
    return "border-sky-300/30 text-sky-200";
  }

  return "border-amber-300/30 text-amber-200";
}

function buildDraftClip(videoId: string, startTime = 0): FilmClip {
  return {
    id: `clip-manual-${Date.now()}`,
    videoId,
    startTime: round(startTime, 1),
    endTime: round(startTime + 8, 1),
    quarter: 1,
    down: 1,
    distance: 10,
    yardLine: 25,
    playType: "run",
    yardsGained: 0,
    outcome: "gain",
    playerIds: [],
    tags: [],
    notes: "",
    epa: 0,
    success: false,
    explosive: false,
    confidence: 0.58,
    automationLevel: "manual",
  };
}

function normalizeClip(clip: FilmClip): FilmClip {
  const endTime = Math.max(clip.startTime + 1, clip.endTime);
  const success =
    clip.outcome === "touchdown" ||
    clip.outcome === "first-down" ||
    clip.yardsGained >= clip.distance ||
    (clip.down === 1 && clip.yardsGained >= 4);
  const explosive = clip.playType === "pass" || clip.playType === "screen" ? clip.yardsGained >= 16 : clip.yardsGained >= 11;
  const epa = round(
    clamp(
      clip.yardsGained * 0.075 +
        (success ? 0.35 : -0.24) +
        (explosive ? 0.95 : 0) +
        (clip.outcome === "turnover" ? -2.4 : 0) +
        (clip.outcome === "touchdown" ? 1.6 : 0),
      -5.5,
      6.5
    ),
    2
  );

  return {
    ...clip,
    endTime,
    success,
    explosive,
    epa,
    confidence: round(clamp(clip.confidence, 0.1, 0.99), 2),
    playerIds: [...new Set(clip.playerIds)],
    tags: [...new Set(clip.tags.filter(Boolean))],
  };
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clapperboard;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3 pt-1">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function FootballFieldBackdrop({
  title,
  resolution,
  startTime,
  endTime,
}: {
  title: string;
  resolution: string;
  startTime: number;
  endTime: number;
}) {
  const stripeColors = ["#17633f", "#1f7548"];
  const yardNumbers = [
    { x: 18, label: "10" },
    { x: 30, label: "20" },
    { x: 42, label: "30" },
    { x: 58, label: "30" },
    { x: 70, label: "20" },
    { x: 82, label: "10" },
  ];

  return (
    <div className="relative aspect-video min-h-72 overflow-hidden bg-[#17633f]">
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect width="100" height="100" fill="#17633f" />
        {Array.from({ length: 10 }, (_, index) => (
          <rect
            key={`stripe-${index}`}
            x={index * 10}
            y="0"
            width="10"
            height="100"
            fill={stripeColors[index % stripeColors.length]}
          />
        ))}
        <rect x="3" y="8" width="94" height="84" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="0.45" />
        {Array.from({ length: 11 }, (_, index) => index * 10).map((x) => (
          <g key={`field-line-${x}`}>
            <line
              x1={x}
              x2={x}
              y1="8"
              y2="92"
              stroke="rgba(255,255,255,0.74)"
              strokeWidth={x === 50 ? 0.62 : 0.42}
            />
            {Array.from({ length: 4 }, (_, tickIndex) => 16 + tickIndex * 20).map((y) => (
              <line
                key={`tick-${x}-${y}`}
                x1={x}
                x2={x}
                y1={y}
                y2={y + 2.8}
                stroke="rgba(255,255,255,0.72)"
                strokeWidth="0.35"
              />
            ))}
          </g>
        ))}
        {Array.from({ length: 19 }, (_, index) => 5 + index * 5).map((x) => (
          <g key={`hash-${x}`}>
            <line x1={x} x2={x} y1="38.5" y2="41.5" stroke="rgba(255,255,255,0.82)" strokeWidth="0.34" />
            <line x1={x} x2={x} y1="58.5" y2="61.5" stroke="rgba(255,255,255,0.82)" strokeWidth="0.34" />
          </g>
        ))}
        <rect x="0" y="8" width="3" height="84" fill="#103a2b" />
        <rect x="97" y="8" width="3" height="84" fill="#103a2b" />
        <text x="1.5" y="54" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="3.2" fontFamily="monospace" transform="rotate(-90 1.5 54)">
          MOUNT OLIVE
        </text>
        <text x="98.5" y="54" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="3.2" fontFamily="monospace" transform="rotate(90 98.5 54)">
          MARAUDERS
        </text>
        {yardNumbers.map((item) => (
          <g key={`number-${item.x}-${item.label}`}>
            <text x={item.x} y="30" textAnchor="middle" fill="rgba(255,255,255,0.64)" fontSize="5.4" fontFamily="monospace" fontWeight="700">
              {item.label}
            </text>
            <text x={item.x} y="75" textAnchor="middle" fill="rgba(255,255,255,0.64)" fontSize="5.4" fontFamily="monospace" fontWeight="700" transform={`rotate(180 ${item.x} 75)`}>
              {item.label}
            </text>
          </g>
        ))}
        <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.45" />
        <text x="50" y="52.2" textAnchor="middle" fill="rgba(255,255,255,0.58)" fontSize="5.5" fontFamily="monospace" fontWeight="800">
          MO
        </text>
      </svg>
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/20 bg-black/45 px-3 py-2 text-xs text-white backdrop-blur">
        <span className="truncate font-medium">{title}</span>
        <span className="font-mono text-white/75">
          {formatClock(startTime)} - {formatClock(endTime)} / {resolution}
        </span>
      </div>
    </div>
  );
}

function detectionColor(type: VisionDetection["type"]) {
  if (type === "jersey" || type === "ball-carrier") {
    return {
      stroke: "rgb(52 211 153)",
      fill: "rgba(16, 185, 129, 0.18)",
      text: "text-emerald-100",
      border: "border-emerald-300/70",
    };
  }

  if (type === "formation" || type === "coverage") {
    return {
      stroke: "rgb(56 189 248)",
      fill: "rgba(14, 165, 233, 0.16)",
      text: "text-sky-100",
      border: "border-sky-300/70",
    };
  }

  if (type === "pressure") {
    return {
      stroke: "rgb(248 113 113)",
      fill: "rgba(239, 68, 68, 0.16)",
      text: "text-red-100",
      border: "border-red-300/70",
    };
  }

  return {
    stroke: "rgb(250 204 21)",
    fill: "rgba(250, 204, 21, 0.16)",
    text: "text-yellow-100",
    border: "border-yellow-300/70",
  };
}

function routePath(detection: VisionDetection, index: number) {
  const wave = index % 2 === 0 ? -1 : 1;
  const controlX = clamp(detection.x + 8 + index * 0.8, 4, 96);
  const controlY = clamp(detection.y + wave * (12 + index * 1.2), 6, 94);
  const endX = clamp(detection.x + 18 + index * 0.9, 4, 96);
  const endY = clamp(detection.y + wave * (18 + index * 1.4), 6, 94);

  return `M ${detection.x} ${detection.y} Q ${controlX} ${controlY} ${endX} ${endY}`;
}

type SimulatedPlayerTrack = {
  id: string;
  label: string;
  unit: "offense" | "defense";
  role: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  delay: number;
  duration: number;
};

function easeInOut(value: number) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function trackProgress(progress: number, delay: number, duration: number) {
  return easeInOut(clamp((progress - delay) / duration, 0, 1));
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function pointOnTrack(track: SimulatedPlayerTrack, progress: number) {
  const localProgress = trackProgress(progress, track.delay, track.duration);
  const wiggle = Math.sin(localProgress * Math.PI) * (track.unit === "offense" ? -2.4 : 2.2);

  return {
    x: interpolate(track.start.x, track.end.x, localProgress),
    y: interpolate(track.start.y, track.end.y, localProgress) + wiggle,
  };
}

function simulatedPlayerTracks(clip: FilmClip, detections: VisionDetection[]): SimulatedPlayerTrack[] {
  const lineOfScrimmage = clamp(12 + clip.yardLine * 0.72, 9, 76);
  const gainDirection = clip.yardsGained >= 0 ? 1 : -1;
  const gainDepth = clamp(Math.abs(clip.yardsGained) * 0.72 + 10, 8, 28) * gainDirection;
  const ballCarrier = detections.find((detection) => detection.type === "ball-carrier");
  const pressure = detections.find((detection) => detection.type === "pressure");
  const passLike = clip.playType === "pass" || clip.playType === "screen";

  const offense: SimulatedPlayerTrack[] = [
    {
      id: "qb",
      label: "QB",
      unit: "offense",
      role: "mesh",
      start: { x: lineOfScrimmage - 5, y: 50 },
      end: { x: passLike ? lineOfScrimmage - 8 : lineOfScrimmage - 4, y: passLike ? 51 : 50 },
      delay: 0,
      duration: 0.46,
    },
    {
      id: "rb",
      label: "RB",
      unit: "offense",
      role: "ball",
      start: { x: lineOfScrimmage - 9, y: 58 },
      end: {
        x: ballCarrier?.x ?? lineOfScrimmage + (clip.playType === "run" ? gainDepth : 8),
        y: ballCarrier?.y ?? (clip.playType === "run" ? 45 : 37),
      },
      delay: clip.playType === "run" ? 0.12 : 0.28,
      duration: 0.72,
    },
    {
      id: "x",
      label: "X",
      unit: "offense",
      role: "route",
      start: { x: lineOfScrimmage - 1, y: 23 },
      end: { x: lineOfScrimmage + (passLike ? 24 : 13), y: passLike ? 18 : 27 },
      delay: 0.05,
      duration: 0.74,
    },
    {
      id: "slot",
      label: "S",
      unit: "offense",
      role: "motion",
      start: { x: lineOfScrimmage - 2, y: 36 },
      end: { x: lineOfScrimmage + (passLike ? 19 : 14), y: passLike ? 43 : 34 },
      delay: 0.02,
      duration: 0.68,
    },
    {
      id: "te",
      label: "TE",
      unit: "offense",
      role: "seam",
      start: { x: lineOfScrimmage - 1, y: 67 },
      end: { x: lineOfScrimmage + (passLike ? 16 : 9), y: passLike ? 63 : 70 },
      delay: 0.04,
      duration: 0.7,
    },
    {
      id: "ol",
      label: "OL",
      unit: "offense",
      role: "wall",
      start: { x: lineOfScrimmage - 2, y: 51 },
      end: { x: lineOfScrimmage + 3, y: 51 },
      delay: 0,
      duration: 0.4,
    },
  ];

  const defense: SimulatedPlayerTrack[] = [
    {
      id: "edge",
      label: "E",
      unit: "defense",
      role: "rush",
      start: { x: pressure?.x ?? lineOfScrimmage + 4, y: pressure?.y ?? 65 },
      end: { x: lineOfScrimmage - 5, y: 53 },
      delay: 0.03,
      duration: 0.62,
    },
    {
      id: "dt",
      label: "T",
      unit: "defense",
      role: "fit",
      start: { x: lineOfScrimmage + 3, y: 48 },
      end: { x: lineOfScrimmage + 1, y: 47 },
      delay: 0,
      duration: 0.48,
    },
    {
      id: "lb",
      label: "LB",
      unit: "defense",
      role: "trigger",
      start: { x: lineOfScrimmage + 8, y: 54 },
      end: { x: lineOfScrimmage + gainDepth * 0.54, y: clip.playType === "run" ? 45 : 42 },
      delay: 0.15,
      duration: 0.62,
    },
    {
      id: "nickel",
      label: "N",
      unit: "defense",
      role: "match",
      start: { x: lineOfScrimmage + 9, y: 34 },
      end: { x: lineOfScrimmage + (passLike ? 20 : 11), y: passLike ? 39 : 35 },
      delay: 0.08,
      duration: 0.7,
    },
    {
      id: "safety",
      label: "FS",
      unit: "defense",
      role: "cap",
      start: { x: lineOfScrimmage + 20, y: 28 },
      end: { x: lineOfScrimmage + (passLike ? 27 : 17), y: passLike ? 24 : 31 },
      delay: 0.18,
      duration: 0.66,
    },
  ];

  return [...offense, ...defense].map((track) => ({
    ...track,
    start: { x: clamp(track.start.x, 4, 96), y: clamp(track.start.y, 8, 92) },
    end: { x: clamp(track.end.x, 4, 96), y: clamp(track.end.y, 8, 92) },
  }));
}

function ballPositionFor(clip: FilmClip, tracks: SimulatedPlayerTrack[], progress: number) {
  const qb = tracks.find((track) => track.id === "qb")!;
  const rb = tracks.find((track) => track.id === "rb")!;
  const x = tracks.find((track) => track.id === "x")!;
  const slot = tracks.find((track) => track.id === "slot")!;
  const passLike = clip.playType === "pass" || clip.playType === "screen";
  const target = clip.playType === "screen" ? slot : passLike ? x : rb;

  if (!passLike && progress < 0.25) {
    const handoffProgress = easeInOut(progress / 0.25);
    const qbPoint = pointOnTrack(qb, progress);
    const rbPoint = pointOnTrack(rb, progress);

    return {
      x: interpolate(qbPoint.x, rbPoint.x, handoffProgress),
      y: interpolate(qbPoint.y, rbPoint.y, handoffProgress),
    };
  }

  if (passLike && progress < 0.42) {
    return pointOnTrack(qb, progress);
  }

  if (passLike && progress < 0.68) {
    const throwProgress = easeInOut((progress - 0.42) / 0.26);
    const qbPoint = pointOnTrack(qb, 0.42);
    const targetPoint = pointOnTrack(target, progress);

    return {
      x: interpolate(qbPoint.x, targetPoint.x, throwProgress),
      y: interpolate(qbPoint.y, targetPoint.y, throwProgress) - Math.sin(throwProgress * Math.PI) * 9,
    };
  }

  return pointOnTrack(target, progress);
}

function ComputerVisionOverlay({
  clip,
  detections,
  acceptedDetections,
  onAcceptDetection,
  primaryPlayer,
  simulationProgress,
  isSimulating,
}: {
  clip: FilmClip;
  detections: VisionDetection[];
  acceptedDetections: Set<string>;
  onAcceptDetection: (detection: VisionDetection) => void;
  primaryPlayer?: Player;
  simulationProgress: number;
  isSimulating: boolean;
}) {
  const lineOfScrimmage = clamp(12 + clip.yardLine * 0.72, 9, 88);
  const firstDownLine = clamp(lineOfScrimmage + clip.distance * 0.72, 12, 94);
  const ballCarrier = detections.find((detection) => detection.type === "ball-carrier") ?? detections.find((detection) => detection.type === "jersey");
  const formation = detections.find((detection) => detection.type === "formation");
  const coverage = detections.find((detection) => detection.type === "coverage");
  const pressure = detections.find((detection) => detection.type === "pressure");
  const motion = detections.find((detection) => detection.type === "motion");
  const trackedRoutes = detections.filter((detection) =>
    ["jersey", "ball-carrier", "motion", "pressure"].includes(detection.type)
  );
  const playerTracks = simulatedPlayerTracks(clip, detections);
  const playerPositions = playerTracks.map((track) => ({
    track,
    point: pointOnTrack(track, simulationProgress),
  }));
  const ballPosition = ballPositionFor(clip, playerTracks, simulationProgress);

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="cv-arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4.2" refY="2.5">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="rgb(250 204 21)" />
          </marker>
          <linearGradient id="cv-pressure" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(239,68,68,0.55)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0.12)" />
          </linearGradient>
        </defs>

        {Array.from({ length: 11 }, (_, index) => index * 10).map((x) => (
          <line key={`yard-${x}`} x1={x} x2={x} y1="8" y2="92" stroke="rgba(255,255,255,0.18)" strokeWidth="0.28" />
        ))}
        {Array.from({ length: 9 }, (_, index) => 12 + index * 10).map((x) => (
          <g key={`hash-${x}`}>
            <line x1={x} x2={x} y1="38" y2="42" stroke="rgba(255,255,255,0.34)" strokeWidth="0.36" />
            <line x1={x} x2={x} y1="58" y2="62" stroke="rgba(255,255,255,0.34)" strokeWidth="0.36" />
          </g>
        ))}

        <rect x="3" y="8" width="94" height="84" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.35" />
        <line x1={lineOfScrimmage} x2={lineOfScrimmage} y1="8" y2="92" stroke="rgb(59 130 246)" strokeWidth="0.72" />
        <line x1={firstDownLine} x2={firstDownLine} y1="8" y2="92" stroke="rgb(250 204 21)" strokeWidth="0.72" strokeDasharray="1.6 1.1" />

        {pressure && ballCarrier && (
          <path
            d={`M ${pressure.x} ${pressure.y} C ${pressure.x + 8} ${pressure.y - 12}, ${ballCarrier.x - 7} ${ballCarrier.y + 10}, ${ballCarrier.x} ${ballCarrier.y}`}
            fill="none"
            stroke="url(#cv-pressure)"
            strokeWidth="1.2"
            strokeDasharray="2 1.2"
          />
        )}

        {trackedRoutes.map((detection, index) => {
          const color = detectionColor(detection.type);

          return (
            <path
              key={`route-${detection.id}`}
              d={routePath(detection, index)}
              fill="none"
              stroke={color.stroke}
              strokeWidth={detection.type === "ball-carrier" ? 1.25 : 0.82}
              strokeDasharray={detection.type === "motion" ? "2 1.2" : undefined}
              markerEnd={detection.type === "motion" ? "url(#cv-arrow)" : undefined}
              opacity={0.9}
            />
          );
        })}

        {playerTracks.map((track) => {
          const start = track.start;
          const end = track.end;

          return (
            <line
              key={`sim-trail-${track.id}`}
              x1={start.x}
              x2={interpolate(start.x, end.x, trackProgress(simulationProgress, track.delay, track.duration))}
              y1={start.y}
              y2={interpolate(start.y, end.y, trackProgress(simulationProgress, track.delay, track.duration))}
              stroke={track.unit === "offense" ? "rgba(52,211,153,0.48)" : "rgba(248,113,113,0.42)"}
              strokeWidth={track.role === "ball" ? 1.2 : 0.7}
              strokeDasharray={track.role === "motion" || track.unit === "defense" ? "1.4 1.1" : undefined}
            />
          );
        })}

        {motion && (
          <line
            x1={motion.x - 9}
            x2={motion.x + 13}
            y1={motion.y + 8}
            y2={motion.y - 6}
            stroke="rgb(250 204 21)"
            strokeWidth="1"
            markerEnd="url(#cv-arrow)"
          />
        )}
      </svg>

      <div className="absolute left-3 top-3 grid gap-2">
        <div className="rounded-md border border-emerald-300/50 bg-black/70 px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono text-[11px] uppercase text-emerald-200">CV Overlay Live</div>
          <div className="text-xs text-white">{detections.length} Objects / {Math.round(clip.confidence * 100)}% Clip Confidence</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {formation && <Badge variant="outline" className="bg-black/60 text-sky-100">{formation.label}</Badge>}
          {coverage && <Badge variant="outline" className="bg-black/60 text-sky-100">{coverage.label}</Badge>}
          {primaryPlayer && <Badge variant="outline" className="bg-black/60 text-emerald-100">#{primaryPlayer.number} Lock</Badge>}
        </div>
      </div>

      <div className="absolute right-3 top-3 grid gap-1.5 text-right font-mono text-[11px]">
        <div className="rounded border border-blue-300/50 bg-black/65 px-2 py-1 text-blue-100">LOS {clip.yardLine}</div>
        <div className="rounded border border-yellow-300/50 bg-black/65 px-2 py-1 text-yellow-100">1st +{clip.distance}</div>
        <div className="rounded border border-white/20 bg-black/65 px-2 py-1 text-white">
          {isSimulating ? "Live Sim" : "Paused"} {Math.round(simulationProgress * 100)}%
        </div>
      </div>

      {playerPositions.map(({ track, point }) => (
        <div
          key={`sim-player-${track.id}`}
          className={cn(
            "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-semibold shadow-[0_0_18px_rgba(255,255,255,0.16)]",
            track.unit === "offense"
              ? "border-emerald-200 bg-emerald-400 text-emerald-950"
              : "border-red-200 bg-red-400 text-red-950"
          )}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          {track.label}
          <span
            className={cn(
              "absolute -inset-1 rounded-full border opacity-40",
              track.unit === "offense" ? "border-emerald-200" : "border-red-200"
            )}
          />
        </div>
      ))}

      <div
        className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-orange-100 bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.75)]"
        style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
        aria-label="Animated Football"
      >
        <span className="h-2.5 w-1.5 rounded-full bg-orange-950/45" />
      </div>

      {detections.map((detection, index) => {
        const color = detectionColor(detection.type);
        const accepted = acceptedDetections.has(detection.id);

        return (
          <button
            key={detection.id}
            className={cn(
              "pointer-events-auto absolute min-w-16 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-black/70 px-1.5 py-1 text-left shadow-lg backdrop-blur transition-transform hover:scale-105",
              color.border,
              accepted && "ring-2 ring-emerald-300/60"
            )}
            style={{ left: `${detection.x}%`, top: `${detection.y}%` }}
            type="button"
            aria-label={`Accept ${detection.label}`}
            onClick={() => onAcceptDetection(detection)}
          >
            <div className={cn("font-mono text-[10px] leading-none", color.text)}>
              {titleCase(detection.type)}
            </div>
            <div className="mt-0.5 max-w-24 truncate text-[11px] leading-tight text-white">{detection.label}</div>
            <div className="mt-1 h-1 rounded-full bg-white/15">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(detection.confidence * 100)}%`,
                  backgroundColor: color.stroke,
                }}
              />
            </div>
            {index < 3 && (
              <span
                className="absolute -inset-2 rounded-lg border opacity-45"
                style={{ borderColor: color.stroke, background: color.fill }}
              />
            )}
          </button>
        );
      })}

      <div className="absolute inset-x-3 bottom-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-md border border-white/15 bg-black/65 px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Route Vector</div>
          <div className="text-xs text-white">{clip.playType === "pass" ? "Vertical stem + pressure bend" : "Run lane and pursuit fit"}</div>
        </div>
        <div className="rounded-md border border-white/15 bg-black/65 px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Motion Signal</div>
          <div className="text-xs text-white">{motion?.label ?? "No motion tagged"}</div>
        </div>
        <div className="rounded-md border border-white/15 bg-black/65 px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Pressure Read</div>
          <div className="text-xs text-white">{pressure?.label ?? "Pocket clean"}</div>
        </div>
      </div>
    </div>
  );
}

export function FilmAnalysisWorkbench({
  videos,
  initialClips,
  automationSuggestions,
  visionDetections,
  players,
}: {
  videos: VideoAsset[];
  initialClips: FilmClip[];
  automationSuggestions: FilmAutomationSuggestion[];
  visionDetections: VisionDetection[];
  players: Player[];
}) {
  const firstVideoId = videos[0]?.id ?? "video-draft";
  const firstClip = initialClips[0] ?? buildDraftClip(firstVideoId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clips, setClips] = useState<FilmClip[]>(initialClips);
  const [selectedVideoId, setSelectedVideoId] = useState(firstClip.videoId);
  const [draft, setDraft] = useState<FilmClip>(firstClip);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [acceptedDetections, setAcceptedDetections] = useState<Set<string>>(new Set());
  const simulationProgressRef = useRef(0);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
    };
  }, [localVideoUrl]);

  useEffect(() => {
    if (!isSimulating) {
      return;
    }

    let frameId = 0;
    let lastCommitTime = 0;
    const startTime = performance.now() - simulationProgressRef.current * playSimulationDurationMs;

    function tick(now: number) {
      const nextProgress = ((now - startTime) % playSimulationDurationMs) / playSimulationDurationMs;
      simulationProgressRef.current = nextProgress;

      if (now - lastCommitTime >= playSimulationFrameIntervalMs) {
        lastCommitTime = now;
        setSimulationProgress(nextProgress);
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [isSimulating]);

  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? videos[0];
  const visibleClips = useMemo(
    () =>
      clips
        .filter((clip) => clip.videoId === selectedVideoId)
        .slice()
        .sort((left, right) => left.startTime - right.startTime),
    [clips, selectedVideoId]
  );
  const selectedClipSuggestions = automationSuggestions.filter((suggestion) => suggestion.clipId === draft.id);
  const selectedClipDetections = visionDetections.filter((detection) => detection.clipId === draft.id);
  const playerOptions = players.filter((player) => player.primaryUnit !== "special-teams").slice(0, 42);
  const primaryPlayer = draft.playerIds[0] ? players.find((player) => player.id === draft.playerIds[0]) : undefined;

  const clipMetrics = useMemo(() => {
    const avgConfidence = mean(clips.map((clip) => clip.confidence));
    const successRate = ratio(clips.filter((clip) => clip.success).length, clips.length);
    const automated = clips.filter((clip) => clip.automationLevel !== "manual").length;

    return {
      avgConfidence,
      successRate,
      automated,
      avgEpa: mean(clips.map((clip) => clip.epa)),
    };
  }, [clips]);

  const playTypeRows = useMemo(
    () =>
      playTypeOptions.map((playType) => ({
        playType: titleCase(playType),
        count: clips.filter((clip) => clip.playType === playType).length,
        avgEpa: round(mean(clips.filter((clip) => clip.playType === playType).map((clip) => clip.epa)), 2),
      })),
    [clips]
  );

  const clipTrendRows = useMemo(
    () =>
      clips
        .slice()
        .sort((left, right) => left.startTime - right.startTime)
        .slice(0, 48)
        .map((clip, index) => ({
          clip: `C${String(index + 1).padStart(2, "0")}`,
          yards: clip.yardsGained,
          epa: clip.epa,
          confidence: round(clip.confidence * 100, 1),
        })),
    [clips]
  );

  function updateDraft<Key extends keyof FilmClip>(key: Key, value: FilmClip[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function resetPlaySimulation(play = true) {
    simulationProgressRef.current = 0;
    setSimulationProgress(0);
    setIsSimulating(play);
  }

  function selectClip(clipId: string) {
    const nextClip = clips.find((clip) => clip.id === clipId);

    if (!nextClip) {
      return;
    }

    setSelectedVideoId(nextClip.videoId);
    setDraft(nextClip);
    resetPlaySimulation(true);
  }

  function selectVideo(videoId: string) {
    setSelectedVideoId(videoId);

    const firstClipForVideo = clips
      .filter((clip) => clip.videoId === videoId)
      .slice()
      .sort((left, right) => left.startTime - right.startTime)[0];

    if (firstClipForVideo) {
      setDraft(firstClipForVideo);
      resetPlaySimulation(true);
    }
  }

  function updateNumeric<Key extends keyof FilmClip>(key: Key, value: string) {
    const numericValue = Number(value);

    if (!Number.isNaN(numericValue)) {
      updateDraft(key, numericValue as FilmClip[Key]);
    }
  }

  function handleVideoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (localVideoUrl) {
      URL.revokeObjectURL(localVideoUrl);
    }

    setLocalVideoUrl(URL.createObjectURL(file));
    setUploadedName(file.name);
  }

  function setBoundary(boundary: "startTime" | "endTime") {
    const currentTime = videoRef.current?.currentTime ?? draft[boundary];
    updateDraft(boundary, round(currentTime, 1));
  }

  function saveDraft() {
    const savedClip = normalizeClip(draft);
    setClips((current) => {
      const existing = current.some((clip) => clip.id === savedClip.id);

      if (existing) {
        return current.map((clip) => (clip.id === savedClip.id ? savedClip : clip));
      }

      return [...current, savedClip];
    });
  }

  function createManualClip() {
    const currentTime = videoRef.current?.currentTime ?? draft.endTime + 4;
    const nextClip = buildDraftClip(selectedVideoId, currentTime);
    setClips((current) => [...current, nextClip]);
    setDraft(nextClip);
    resetPlaySimulation(true);
  }

  function applySuggestion(suggestion: FilmAutomationSuggestion) {
    setAcceptedSuggestions((current) => new Set(current).add(suggestion.id));
    setDraft((current) => ({
      ...current,
      ...suggestion.suggestedFields,
      confidence: Math.max(current.confidence, suggestion.confidence),
      automationLevel: "semi-automated",
    }));
  }

  function acceptDetection(detection: VisionDetection) {
    setAcceptedDetections((current) => new Set(current).add(detection.id));
    setDraft((current) => ({
      ...current,
      automationLevel: "computer-vision",
      confidence: Math.max(current.confidence, detection.confidence),
      playerIds:
        detection.playerId && !current.playerIds.includes(detection.playerId)
          ? [...current.playerIds, detection.playerId]
          : current.playerIds,
      tags: [...new Set([...current.tags, labelToTag(detection.label), detection.type])],
    }));
  }

  function toggleTag(tag: string) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Tagged Clips" value={String(clips.length)} icon={Clapperboard} />
        <MetricTile label="Automation Coverage" value={`${Math.round(ratio(clipMetrics.automated, clips.length) * 100)}%`} icon={WandSparkles} />
        <MetricTile label="Success Rate" value={`${Math.round(clipMetrics.successRate * 100)}%`} icon={Check} />
        <MetricTile label="Mean Confidence" value={`${Math.round(clipMetrics.avgConfidence * 100)}%`} icon={ScanLine} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Film Workspace</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedVideo?.status ? titleCase(selectedVideo.status) : "Ready"}</Badge>
                <Badge variant="outline">{selectedVideo?.cameraAngle ?? "Press-Box Wide"}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Select value={selectedVideoId} onValueChange={selectVideo}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Video" />
                </SelectTrigger>
                <SelectContent>
                  {videos.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {selectedVideo?.externalUrl && (
                  <Button asChild variant="outline" className="w-full md:w-auto">
                    <a href={selectedVideo.externalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Open Hudl Source
                    </a>
                  </Button>
                )}
                <div className="relative">
                  <Input className="absolute inset-0 cursor-pointer opacity-0" type="file" accept="video/*" onChange={handleVideoUpload} aria-label="Upload Game Film" />
                  <Button variant="outline" className="w-full md:w-auto" type="button">
                    <Upload className="size-4" />
                    Upload Film
                  </Button>
                </div>
              </div>
            </div>

            {selectedVideo?.externalUrl && (
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="font-medium">Hudl Show-Off Source Connected</div>
                  <div className="mt-1 text-muted-foreground">
                    The demo analysis layer is staged as if it was generated from the shared Mount Olive Hudl reel.
                  </div>
                </div>
                <Badge variant="outline">Public Reel</Badge>
              </div>
            )}

            <div className="relative overflow-hidden rounded-lg border bg-black">
              {localVideoUrl ? (
                <video ref={videoRef} src={localVideoUrl} controls className="aspect-video w-full bg-black" />
              ) : (
                <FootballFieldBackdrop
                  title={uploadedName ?? selectedVideo?.title ?? "Game Film"}
                  resolution={selectedVideo?.resolution ?? "1280x720"}
                  startTime={draft.startTime}
                  endTime={draft.endTime}
                />
              )}
              <ComputerVisionOverlay
                clip={draft}
                detections={selectedClipDetections}
                acceptedDetections={acceptedDetections}
                onAcceptDetection={acceptDetection}
                primaryPlayer={primaryPlayer}
                simulationProgress={simulationProgress}
                isSimulating={isSimulating}
              />
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Animated Play Simulation</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    Player dots, pursuit paths, and ball movement / {Math.round(simulationProgress * 100)}%
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsSimulating((current) => !current)}>
                    {isSimulating ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {isSimulating ? "Pause Motion" : "Play Motion"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => resetPlaySimulation(true)}>
                    <RotateCcw className="size-4" />
                    Restart Play
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={simulationProgress * 100} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setBoundary("startTime")}>
                <Scissors className="size-4" />
                Set In
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBoundary("endTime")}>
                <Scissors className="size-4" />
                Set Out
              </Button>
              <Button variant="outline" size="sm" onClick={createManualClip}>
                <Plus className="size-4" />
                New Clip
              </Button>
              <Button size="sm" onClick={saveDraft}>
                <Save className="size-4" />
                Save Tagged Play
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Clip Tagging</CardTitle>
              <Badge variant="outline" className={confidenceTone(draft.confidence)}>
                {Math.round(draft.confidence * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="number" value={draft.startTime} onChange={(event) => updateNumeric("startTime", event.currentTarget.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="number" value={draft.endTime} onChange={(event) => updateNumeric("endTime", event.currentTarget.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Quarter</Label>
                <Input type="number" min={1} max={4} value={draft.quarter} onChange={(event) => updateNumeric("quarter", event.currentTarget.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Down</Label>
                <Select value={String(draft.down)} onValueChange={(value) => updateDraft("down", Number(value) as FilmClip["down"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((down) => (
                      <SelectItem key={down} value={String(down)}>
                        {down}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Distance</Label>
                <Input type="number" min={1} value={draft.distance} onChange={(event) => updateNumeric("distance", event.currentTarget.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Yard Line</Label>
                <Input type="number" min={1} max={99} value={draft.yardLine} onChange={(event) => updateNumeric("yardLine", event.currentTarget.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Play Type</Label>
                <Select value={draft.playType} onValueChange={(value) => updateDraft("playType", value as PlayType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {playTypeOptions.map((playType) => (
                      <SelectItem key={playType} value={playType}>
                        {titleCase(playType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Yards</Label>
                <Input type="number" value={draft.yardsGained} onChange={(event) => updateNumeric("yardsGained", event.currentTarget.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Select value={draft.outcome} onValueChange={(value) => updateDraft("outcome", value as FilmClipOutcome)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {outcomeOptions.map((outcome) => (
                      <SelectItem key={outcome} value={outcome}>
                        {titleCase(outcome)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Primary Player</Label>
                <Select
                  value={draft.playerIds[0] ?? "none"}
                  onValueChange={(value) => updateDraft("playerIds", value === "none" ? [] : [value])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {playerOptions.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.number} {player.name} / {player.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              {commonFilmTags.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  size="xs"
                  variant={draft.tags.includes(tag) ? "default" : "outline"}
                  onClick={() => toggleTag(tag)}
                >
                  {titleCase(tag)}
                </Button>
              ))}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Clip</div>
                <div className="font-mono">{compactClipLabel(draft)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">EPA</div>
                <div className="font-mono">{round(normalizeClip(draft).epa, 2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Player</div>
                <div className="truncate">{primaryPlayer ? `#${primaryPlayer.number}` : "Open"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="manual">Phase 1 Film Tags</TabsTrigger>
          <TabsTrigger value="automation">Phase 2 Automation</TabsTrigger>
          <TabsTrigger value="vision">Phase 3 Vision</TabsTrigger>
          <TabsTrigger value="analytics">Clip Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tagged Clip Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleDataTable
                dense
                rows={visibleClips.slice(0, 24)}
                columns={[
                  {
                    key: "time",
                    header: "Time",
                    cell: (clip) => (
                      <Button variant={clip.id === draft.id ? "default" : "ghost"} size="xs" onClick={() => selectClip(clip.id)}>
                        {compactClipLabel(clip)}
                      </Button>
                    ),
                  },
                  { key: "type", header: "Type", cell: (clip) => titleCase(clip.playType) },
                  { key: "yards", header: "Yards", cell: (clip) => <span className="font-mono">{clip.yardsGained}</span> },
                  { key: "outcome", header: "Outcome", cell: (clip) => <Badge variant="outline">{titleCase(clip.outcome)}</Badge> },
                  {
                    key: "automation",
                    header: "Source",
                    cell: (clip) => <Badge variant="outline">{titleCase(clip.automationLevel)}</Badge>,
                  },
                  {
                    key: "tags",
                    header: "Tags",
                    cell: (clip) => (
                      <div className="flex flex-wrap gap-1">
                        {clip.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {titleCase(tag)}
                          </Badge>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filmPipelineStages.map((stage) => (
                  <div key={stage.stage} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{stage.stage}</div>
                        <div className="text-xs text-muted-foreground">{stage.signal}</div>
                      </div>
                      <Badge variant="outline">{stage.status}</Badge>
                    </div>
                    <div className="mt-3">
                      <Progress value={stage.confidence * 100} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Current Clip Suggestions</CardTitle>
                  <Badge variant="outline">{selectedClipSuggestions.length} Queued</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedClipSuggestions.length === 0 ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">No suggestions are queued for this clip.</div>
                ) : (
                  selectedClipSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{titleCase(suggestion.source)}</Badge>
                            <span className="text-sm font-medium">{titleCase(suggestion.label)}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{suggestion.rationale}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={acceptedSuggestions.has(suggestion.id) ? "secondary" : "outline"}
                          onClick={() => applySuggestion(suggestion)}
                        >
                          {acceptedSuggestions.has(suggestion.id) ? <Check className="size-4" /> : <Sparkles className="size-4" />}
                          {acceptedSuggestions.has(suggestion.id) ? "Applied" : "Apply"}
                        </Button>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={suggestion.confidence * 100} />
                        <span className="font-mono text-xs text-muted-foreground">{Math.round(suggestion.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="vision" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Computer-Vision Review Queue</CardTitle>
                  <Badge variant="outline">{selectedClipDetections.length} Detections</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedClipDetections.map((detection) => (
                  <div key={detection.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{titleCase(detection.type)}</Badge>
                        <span className="text-sm font-medium">{detection.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">@ {formatClock(detection.frameTime)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                        <Progress value={detection.confidence * 100} />
                        <span className="font-mono text-xs text-muted-foreground">{Math.round(detection.confidence * 100)}%</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={acceptedDetections.has(detection.id) ? "secondary" : "outline"}
                      onClick={() => acceptDetection(detection)}
                    >
                      {acceptedDetections.has(detection.id) ? <Check className="size-4" /> : <Eye className="size-4" />}
                      {acceptedDetections.has(detection.id) ? "Accepted" : "Accept"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frame Signal Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-[linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:48px_48px]">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                  {selectedClipDetections.map((detection) => (
                    <button
                      key={detection.id}
                      className={cn(
                        "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background shadow-sm transition-transform hover:scale-125",
                        acceptedDetections.has(detection.id)
                          ? "border-emerald-300 text-emerald-200"
                          : "border-sky-300 text-sky-200"
                      )}
                      style={{ left: `${detection.x}%`, top: `${detection.y}%` }}
                      aria-label={detection.label}
                      onClick={() => acceptDetection(detection)}
                    />
                  ))}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>Accepted signals: {acceptedDetections.size}</div>
                  <div>Primary player: {primaryPlayer?.name ?? "Open"}</div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Clip EPA, Yards, and Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsLineChart
                  data={clipTrendRows}
                  xKey="clip"
                  series={[
                    { key: "yards", label: "Yards" },
                    { key: "epa", label: "EPA" },
                    { key: "confidence", label: "Confidence" },
                  ]}
                  height={310}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Play-Type Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsBarChart data={playTypeRows} xKey="playType" yKey="count" height={310} />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Clip-Linked Stat Index</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleDataTable
                dense
                rows={clips.slice(0, 18)}
                columns={[
                  { key: "clip", header: "Clip", cell: (clip) => compactClipLabel(clip) },
                  { key: "type", header: "Type", cell: (clip) => titleCase(clip.playType) },
                  { key: "yards", header: "Yards", cell: (clip) => <span className="font-mono">{clip.yardsGained}</span> },
                  { key: "epa", header: "EPA", cell: (clip) => <span className="font-mono">{clip.epa}</span> },
                  { key: "confidence", header: "Confidence", cell: (clip) => `${Math.round(clip.confidence * 100)}%` },
                  {
                    key: "player",
                    header: "Player",
                    cell: (clip) => {
                      const player = clip.playerIds[0] ? players.find((item) => item.id === clip.playerIds[0]) : undefined;
                      return player ? `${player.name} / #${player.number}` : "Unassigned";
                    },
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
