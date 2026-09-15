import type {
  AutomationSource,
  FilmAutomationLevel,
  FilmAutomationSuggestion,
  FilmClip,
  FilmClipOutcome,
  Play,
  PlayType,
  VideoAsset,
  VisionDetection,
  VisionDetectionType,
} from "@/types";
import { clamp, round } from "@/lib/math";
import { games, opponents, players, plays } from "@/lib/data/sample-football";

export const mountOliveHudlSourceUrl =
  "https://fan.hudl.com/usa/nj/flanders/organization/15630/mount-olive-high-school/team/88326/boys-varsity-football/watch?hr=SGlnaGxpZ2h0UmVlbFN1bW1hcnk2OTA2YjJlNmQ1NzUyMDg0ZWI2Nzc0MDk%3D&ot=TEAM&oi=88326&shared=true";

const filmGames = games.slice(-3);

function opponentName(opponentId?: string) {
  return opponents.find((opponent) => opponent.id === opponentId)?.name ?? "Unknown";
}

function outcomeForPlay(play: Play): FilmClipOutcome {
  if (play.playType === "field-goal") {
    return "field-goal";
  }

  if (play.playType === "punt") {
    return "punt";
  }

  if (play.playType === "penalty") {
    return "penalty";
  }

  if (play.turnover) {
    return "turnover";
  }

  if (play.yardLine + play.yardsGained >= 100) {
    return "touchdown";
  }

  if (play.yardsGained >= play.distance) {
    return "first-down";
  }

  if (play.yardsGained < 0) {
    return "negative";
  }

  return "gain";
}

function automationLevel(index: number): FilmAutomationLevel {
  if (index % 5 === 0) {
    return "computer-vision";
  }

  if (index % 2 === 0) {
    return "semi-automated";
  }

  return "manual";
}

function clipTags(play: Play) {
  return [
    play.explosive ? "explosive" : null,
    play.success ? "successful" : "needs-review",
    play.down >= 3 ? "money-down" : null,
    play.redZone ? "red-zone" : null,
    play.turnover ? "turnover" : null,
    play.playType === "screen" ? "perimeter" : null,
  ].filter(Boolean) as string[];
}

export const commonFilmTags = [
  "missed-tackle",
  "pressure",
  "motion",
  "red-zone",
  "explosive",
  "third-down",
  "coverage-bust",
  "gap-fit",
  "protection",
  "finish",
];

export const sampleFilmVideos: VideoAsset[] = filmGames.map((game, index) => ({
  id: `video-${String(index + 1).padStart(2, "0")}`,
  sport: "football",
  title:
    index === 0
      ? "Mount Olive Hudl shared highlight reel"
      : `Week ${game.week} vs ${opponentName(game.opponentId)} coaches film`,
  externalUrl: index === 0 ? mountOliveHudlSourceUrl : undefined,
  gameId: game.id,
  opponentId: game.opponentId,
  recordedAt: `${game.date}T19:00:00-04:00`,
  durationSeconds: 6420 + index * 380,
  sourceType: index === 0 ? "sideline" : index === 1 ? "hudl" : "broadcast",
  status: index === 2 ? "needs-review" : "ready",
  cameraAngle: index === 1 ? "End-zone and wide angle" : "Press-box wide",
  resolution: index === 2 ? "1920x1080" : "1280x720",
}));

const clipSeedPlays = filmGames.flatMap((game, videoIndex) =>
  plays
    .filter((play) => play.gameId === game.id && play.offense === "mount-olive")
    .slice(0, 22)
    .map((play, playIndex) => ({ game, videoIndex, play, playIndex }))
);

export const sampleFilmClips: FilmClip[] = clipSeedPlays.map(({ game, videoIndex, play, playIndex }, index) => {
  const startTime = 84 + playIndex * 27 + videoIndex * 9 + (playIndex % 4) * 4;
  const duration = clamp(8 + Math.abs(play.yardsGained) * 0.22 + (play.explosive ? 5 : 0), 7, 24);

  return {
    id: `clip-${String(index + 1).padStart(3, "0")}`,
    videoId: sampleFilmVideos[videoIndex]!.id,
    gameId: game.id,
    startTime: round(startTime, 1),
    endTime: round(startTime + duration, 1),
    quarter: play.quarter,
    down: play.down,
    distance: play.distance,
    yardLine: play.yardLine,
    playType: play.playType,
    yardsGained: play.yardsGained,
    outcome: outcomeForPlay(play),
    playerIds: play.playerId ? [play.playerId] : [],
    tags: clipTags(play),
    notes: `${play.playType.toUpperCase()} from the ${play.yardLine} with ${play.yardsGained} yards and ${round(play.epa, 2)} EPA.`,
    epa: play.epa,
    success: play.success,
    explosive: play.explosive,
    confidence: round(clamp(0.55 + (play.success ? 0.08 : 0) + (play.explosive ? 0.05 : 0) + (index % 7) * 0.035, 0.48, 0.94), 2),
    automationLevel: automationLevel(index),
  };
});

const automationSources: AutomationSource[] = [
  "scoreboard-ocr",
  "audio-whistle",
  "field-marker",
  "possession-segmentation",
  "model-fusion",
];

export const sampleFilmAutomationSuggestions: FilmAutomationSuggestion[] = sampleFilmClips
  .slice(0, 34)
  .flatMap((clip, index) => {
    const clockTrim = index % 2 === 0 ? -1.4 : 1.1;
    const source = automationSources[index % automationSources.length]!;
    const correctionSource = automationSources[(index + 2) % automationSources.length]!;

    return [
      {
        id: `suggestion-${clip.id}-window`,
        clipId: clip.id,
        source,
        label: `${source.replaceAll("-", " ")} window`,
        suggestedFields: {
          startTime: round(Math.max(0, clip.startTime + clockTrim), 1),
          endTime: round(clip.endTime + clockTrim * 0.35, 1),
          quarter: clip.quarter,
        },
        confidence: round(clamp(clip.confidence + 0.04, 0.5, 0.96), 2),
        rationale: "Timestamp boundary matched whistle spike, scoreboard clock change, and player reset motion.",
      },
      {
        id: `suggestion-${clip.id}-situation`,
        clipId: clip.id,
        source: correctionSource,
        label: `${correctionSource.replaceAll("-", " ")} situation`,
        suggestedFields: {
          down: clip.down,
          distance: clip.distance,
          yardLine: Math.round(clamp(clip.yardLine + ((index % 3) - 1), 1, 99)),
          playType: clip.playType,
          yardsGained: clip.yardsGained,
          outcome: clip.outcome,
        },
        confidence: round(clamp(clip.confidence - 0.03 + (index % 4) * 0.02, 0.46, 0.93), 2),
        rationale: "Scoreboard crop, chains marker, and play result classifier agree inside tolerance.",
      },
    ];
  });

const formations = ["Trips Right", "Doubles Gun", "Tight Wing", "Empty 3x2", "Pistol Stack", "Bunch Left"];
const coverages = ["Cover 3 Cloud", "Quarters", "Man Free", "Simulated Pressure", "Red-Zone Bracket"];
const motionLabels = ["Jet Motion", "Orbit Motion", "TE Trade", "RB Fast Motion", "No Motion"];

function detectionPosition(index: number, axis: "x" | "y") {
  const base = axis === "x" ? 14 + (index * 19) % 72 : 18 + (index * 13) % 64;
  return round(clamp(base + Math.sin(index * 1.7) * 4, 4, 96), 1);
}

function detection(
  clip: FilmClip,
  index: number,
  type: VisionDetectionType,
  label: string,
  playerId?: string
): VisionDetection {
  return {
    id: `vision-${clip.id}-${type}-${index}`,
    clipId: clip.id,
    type,
    label,
    playerId,
    confidence: round(clamp(0.58 + clip.confidence * 0.28 + (index % 5) * 0.035, 0.5, 0.96), 2),
    frameTime: round(clip.startTime + clamp((clip.endTime - clip.startTime) * 0.42, 2, 9), 1),
    x: detectionPosition(index, "x"),
    y: detectionPosition(index, "y"),
  };
}

export const sampleVisionDetections: VisionDetection[] = sampleFilmClips.slice(0, 42).flatMap((clip, index) => {
  const player = clip.playerIds[0] ? players.find((item) => item.id === clip.playerIds[0]) : undefined;
  const pressureLabel = clip.playType === "pass" || clip.playType === "screen" ? "Edge Pressure" : "Box Fit";

  return [
    detection(clip, index, "formation", formations[index % formations.length]!),
    detection(clip, index + 1, "motion", motionLabels[index % motionLabels.length]!),
    detection(clip, index + 2, "coverage", coverages[index % coverages.length]!),
    detection(clip, index + 3, "pressure", pressureLabel),
    ...(player
      ? [
          detection(
            clip,
            index + 4,
            "jersey",
            `#${player.number} ${player.name}`,
            player.id
          ),
          detection(clip, index + 5, "ball-carrier", player.name, player.id),
        ]
      : []),
  ];
});

export const filmPipelineStages = [
  {
    stage: "Ingest",
    status: "Live",
    signal: `${sampleFilmVideos.length} video sources indexed`,
    confidence: 0.92,
  },
  {
    stage: "Tagging",
    status: "Live",
    signal: `${sampleFilmClips.length} tagged and reviewable clips`,
    confidence: 0.88,
  },
  {
    stage: "Semi-Automation",
    status: "Review",
    signal: `${sampleFilmAutomationSuggestions.length} OCR and timing suggestions queued`,
    confidence: 0.76,
  },
  {
    stage: "Computer Vision",
    status: "Prototype",
    signal: `${sampleVisionDetections.length} formation, jersey, motion, and pressure detections`,
    confidence: 0.68,
  },
];

export const playTypeOptions: PlayType[] = ["run", "pass", "screen", "punt", "field-goal", "penalty"];
