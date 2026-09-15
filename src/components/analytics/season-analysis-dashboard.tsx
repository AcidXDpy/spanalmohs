"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Filter,
  LineChartIcon,
  ListFilter,
  Map,
  RotateCcw,
  Search,
  Table2,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DashboardDriveRow,
  DashboardGameRow,
  DashboardMetricKey,
  DashboardMetricSummary,
  DashboardPlayRow,
  FieldSegment,
  KeyFinding,
  SeasonAnalysisDashboardData,
  SituationCell,
} from "@/lib/stats/football-dashboard";
import {
  buildFieldSegments,
  buildKeyFindings,
  buildMetricSummaries,
  buildSituationMatrix,
  buildSustainability,
  summarizeFootballSelection,
} from "@/lib/stats/football-dashboard";
import { Badge } from "@/components/ui/badge";
import { PerformanceNarrative } from "@/components/analytics/performance-narrative";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { clamp, formatSigned, percent, round } from "@/lib/math";

const ALL = "all";

const percentageMetricKeys = new Set<DashboardMetricKey>([
  "successRate",
  "explosiveRate",
  "scoringDriveRate",
  "turnoverRate",
  "redZoneSuccessRate",
  "thirdDownSuccessRate",
  "earlyDownSuccessRate",
]);

const metricColors = {
  positive: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  negative: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  neutral: "border-border bg-muted/30 text-foreground",
} satisfies Record<DashboardMetricSummary["status"], string>;

const findingStyles = {
  positive: "border-emerald-400/30 bg-emerald-500/10",
  negative: "border-amber-400/40 bg-amber-500/10",
  neutral: "border-border bg-muted/25",
  note: "border-sky-400/30 bg-sky-500/10",
} satisfies Record<KeyFinding["status"], string>;

function formatChange(metric: DashboardMetricSummary) {
  if (metric.change === 0) {
    return "No trend shift";
  }

  if (percentageMetricKeys.has(metric.key)) {
    return `${metric.change > 0 ? "+" : ""}${round(metric.change * 100, 1)} pts`;
  }

  if (metric.key === "pointsPerDrive") {
    return `${metric.change > 0 ? "+" : ""}${round(metric.change, 2)} pts`;
  }

  return `${metric.change > 0 ? "+" : ""}${round(metric.change, 3)}`;
}

function chartValueFormatter(value: number, metric: DashboardMetricSummary) {
  if (percentageMetricKeys.has(metric.key)) {
    return `${round(value * 100, 1)}%`;
  }

  if (metric.key === "pointsPerDrive") {
    return `${round(value, 2)} pts`;
  }

  return round(value, 3);
}

function SelectFilter({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: Array<{ value: string; label: string; meta?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full min-w-0 rounded-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex min-w-0 items-center justify-between gap-4">
                <span className="truncate">{option.label}</span>
                {option.meta && <span className="font-mono text-[11px] text-muted-foreground">{option.meta}</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MetricTile({ metric, selected, onSelect }: { metric: DashboardMetricSummary; selected: boolean; onSelect: () => void }) {
  const isImproving = metric.direction === "lower" ? metric.change < 0 : metric.change > 0;
  const TrendIcon = metric.change === 0 ? LineChartIcon : isImproving ? ArrowUpRight : ArrowDownRight;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "min-h-[148px] rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        metricColors[metric.status],
        selected && "ring-2 ring-ring"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-xs font-medium text-muted-foreground">{metric.label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-foreground">{metric.formattedValue}</div>
        </div>
        <TrendIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{metric.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <span>Sample</span>
        <span className="text-right font-mono">{metric.sampleSize}</span>
        <span>Confidence</span>
        <span className="text-right font-mono">{Math.round(metric.confidence * 100)}%</span>
        <span>Recent Change</span>
        <span className="text-right font-mono">{formatChange(metric)}</span>
      </div>
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof BarChart3;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {badge && (
        <Badge variant="outline" className="font-mono">
          {badge}
        </Badge>
      )}
    </div>
  );
}

function NoDataNotice() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-muted/15 p-6 text-center">
      <div>
        <AlertCircle className="mx-auto mb-2 size-5 text-muted-foreground" />
        <div className="text-sm font-medium">No Matching Data</div>
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
          The selected filters do not contain enough plays or drives for this view. Clear one filter to restore the
          season sample.
        </p>
      </div>
    </div>
  );
}

function SeasonTrendChart({ metric }: { metric: DashboardMetricSummary }) {
  if (metric.trend.length === 0) {
    return <NoDataNotice />;
  }

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={metric.trend} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={48} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            formatter={(value) => [chartValueFormatter(Number(value), metric), metric.label]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as DashboardMetricSummary["trend"][number] | undefined;
              return row ? `${row.week} vs ${row.opponent}` : "";
            }}
          />
          <ReferenceLine y={metric.baseline} stroke="var(--border)" strokeDasharray="4 4" />
          <Bar dataKey="value" name={metric.label} fill="oklch(0.72 0.08 205)" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="value" name={metric.label} stroke="oklch(0.82 0.07 160)" strokeWidth={2.5} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SituationGrid({ cells }: { cells: SituationCell[] }) {
  if (cells.every((cell) => cell.plays === 0)) {
    return <NoDataNotice />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {cells.map((cell) => {
        const positive = cell.epaPerPlay >= 0;
        const strength = clamp(Math.abs(cell.epaPerPlay) * 1.4 + cell.successRate * 0.6, 0.08, 1);
        const style = {
          backgroundColor: positive
            ? `oklch(0.28 0.08 155 / ${0.2 + strength * 0.55})`
            : `oklch(0.26 0.09 35 / ${0.2 + strength * 0.55})`,
        } satisfies CSSProperties;

        return (
          <div key={cell.id} className="min-h-[104px] rounded-lg border p-3" style={style}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{cell.downLabel}</div>
                <div className="text-xs text-muted-foreground">{cell.distanceLabel} Distance</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-semibold">{percent(cell.successRate, 0)}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{cell.plays} Plays</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>EPA per Play</span>
              <span className="text-right font-mono">{formatSigned(cell.epaPerPlay, 3)}</span>
              <span>Explosive Rate</span>
              <span className="text-right font-mono">{percent(cell.explosiveRate, 0)}</span>
            </div>
            <Progress className="mt-3 h-1.5" value={cell.reliability * 100} />
          </div>
        );
      })}
    </div>
  );
}

function FootballField({ segments }: { segments: FieldSegment[] }) {
  const maxPlays = Math.max(...segments.map((segment) => segment.plays), 1);

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="relative h-[280px] overflow-hidden rounded-md border-2 border-white/80 bg-[#287a3f] text-white shadow-inner">
        {Array.from({ length: 11 }, (_, index) => (
          <div
            key={index}
            className="absolute inset-y-0 border-l border-white/70"
            style={{ left: `${index * 10}%` }}
          />
        ))}
        {Array.from({ length: 9 }, (_, index) => {
          const yard = (index + 1) * 10;
          const label = yard <= 50 ? yard : 100 - yard;

          return (
            <div key={yard} className="absolute top-4 -translate-x-1/2 font-mono text-xs font-semibold opacity-85" style={{ left: `${yard}%` }}>
              {label}
            </div>
          );
        })}
        <div className="absolute inset-y-0 left-0 w-[5%] border-r-2 border-white/80 bg-[#1f5f34]" />
        <div className="absolute inset-y-0 right-0 w-[5%] border-l-2 border-white/80 bg-[#1f5f34]" />
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 font-mono text-[10px] uppercase tracking-normal opacity-80">
          Own Goal
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 rotate-90 font-mono text-[10px] uppercase tracking-normal opacity-80">
          Opp Goal
        </div>
        <div className="absolute inset-x-[5%] bottom-8 top-10">
          {segments.map((segment) => {
            const height = clamp(20 + (segment.plays / maxPlays) * 70, 12, 94);
            const positive = segment.epaPerPlay >= 0;

            return (
              <div
                key={segment.id}
                className="absolute bottom-0 rounded-t border border-white/60"
                style={{
                  left: `${segment.start}%`,
                  width: "10%",
                  height: `${height}%`,
                  backgroundColor: positive ? "rgba(16, 185, 129, 0.72)" : "rgba(245, 158, 11, 0.72)",
                }}
                title={`${segment.label}: ${segment.plays} plays, ${formatSigned(segment.epaPerPlay, 3)} EPA/play`}
              >
                <div className="absolute inset-x-0 -top-6 text-center font-mono text-[10px]">{segment.plays || ""}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <span className="inline-block size-2 rounded-sm bg-emerald-500" /> Positive EPA segment
        </div>
        <div>
          <span className="inline-block size-2 rounded-sm bg-amber-500" /> Negative EPA segment
        </div>
        <div className="font-mono">Bar height = selected play volume</div>
      </div>
    </div>
  );
}

function FieldSegmentChart({ segments }: { segments: FieldSegment[] }) {
  const rows = segments.map((segment) => ({
    label: segment.label,
    plays: segment.plays,
    epa: segment.epaPerPlay,
    success: round(segment.successRate * 100, 1),
  }));

  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={42} />
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
            formatter={(value, name) => [name === "success" ? `${value}%` : value, name === "epa" ? "EPA per Play" : name === "success" ? "Success Rate" : "Plays"]}
          />
          <Bar dataKey="plays" fill="oklch(0.7 0.02 250)" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="success" stroke="oklch(0.82 0.07 160)" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function DriveAnalysis({ drives }: { drives: DashboardDriveRow[] }) {
  if (drives.length === 0) {
    return <NoDataNotice />;
  }

  const rows = drives.slice().sort((left, right) => Math.abs(right.epa) - Math.abs(left.epa)).slice(0, 14);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-medium">Game</th>
            <th className="py-2 pr-3 font-medium">Quarter</th>
            <th className="py-2 pr-3 font-medium">Start</th>
            <th className="py-2 pr-3 font-medium">Result</th>
            <th className="py-2 pr-3 text-right font-medium">Plays</th>
            <th className="py-2 pr-3 text-right font-medium">Yards</th>
            <th className="py-2 pr-3 text-right font-medium">Points</th>
            <th className="py-2 pr-0 text-right font-medium">EPA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((drive) => (
            <tr key={drive.id} className="border-b last:border-0">
              <td className="py-2 pr-3">W{drive.week} vs {drive.opponent}</td>
              <td className="py-2 pr-3 font-mono">Q{drive.quarter}</td>
              <td className="py-2 pr-3 font-mono">{drive.startFieldPosition}</td>
              <td className="py-2 pr-3">
                <Badge variant="outline">{drive.resultLabel}</Badge>
              </td>
              <td className="py-2 pr-3 text-right font-mono">{drive.playCount}</td>
              <td className="py-2 pr-3 text-right font-mono">{drive.yards}</td>
              <td className="py-2 pr-3 text-right font-mono">{drive.points}</td>
              <td className={cn("py-2 pr-0 text-right font-mono", drive.epa >= 0 ? "text-emerald-200" : "text-amber-200")}>
                {formatSigned(drive.epa, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayExplorer({ plays }: { plays: DashboardPlayRow[] }) {
  if (plays.length === 0) {
    return <NoDataNotice />;
  }

  const rows = plays
    .slice()
    .sort((left, right) => Math.abs(right.epa) - Math.abs(left.epa))
    .slice(0, 50);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-medium">Game</th>
            <th className="py-2 pr-3 font-medium">Situation</th>
            <th className="py-2 pr-3 font-medium">Field Position</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Player</th>
            <th className="py-2 pr-3 text-right font-medium">Yards</th>
            <th className="py-2 pr-3 text-right font-medium">EPA</th>
            <th className="py-2 pr-0 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((play) => (
            <tr key={play.id} className="border-b last:border-0">
              <td className="py-2 pr-3">W{play.week} vs {play.opponent}</td>
              <td className="py-2 pr-3 font-mono">
                {play.down} and {play.distance}
              </td>
              <td className="py-2 pr-3">
                <span className="font-mono">{play.fieldPosition}</span>
                <span className="ml-2 text-xs text-muted-foreground">{play.fieldZoneLabel}</span>
              </td>
              <td className="py-2 pr-3">{play.playTypeLabel}</td>
              <td className="py-2 pr-3">{play.playerName}</td>
              <td className="py-2 pr-3 text-right font-mono">{play.yardsGained}</td>
              <td className={cn("py-2 pr-3 text-right font-mono", play.epa >= 0 ? "text-emerald-200" : "text-amber-200")}>
                {formatSigned(play.epa, 3)}
              </td>
              <td className="py-2 pr-0">
                <div className="flex flex-wrap gap-1">
                  {play.success && <Badge variant="outline">Success</Badge>}
                  {play.explosive && <Badge variant="outline">Explosive</Badge>}
                  {play.turnover && <Badge variant="destructive">Turnover</Badge>}
                  {play.redZone && <Badge variant="outline">Red Zone</Badge>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GameTable({ games }: { games: DashboardGameRow[] }) {
  if (games.length === 0) {
    return <NoDataNotice />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-medium">Week</th>
            <th className="py-2 pr-3 font-medium">Opponent</th>
            <th className="py-2 pr-3 font-medium">Result</th>
            <th className="py-2 pr-3 text-right font-medium">EPA per Play</th>
            <th className="py-2 pr-3 text-right font-medium">Success</th>
            <th className="py-2 pr-3 text-right font-medium">Points/Drive</th>
            <th className="py-2 pr-0 text-right font-medium">Game Control</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border-b last:border-0">
              <td className="py-2 pr-3 font-mono">W{game.week}</td>
              <td className="py-2 pr-3">{game.opponent}</td>
              <td className="py-2 pr-3">
                <Badge variant="outline">
                  {game.result} {game.score}
                </Badge>
              </td>
              <td className="py-2 pr-3 text-right font-mono">{formatSigned(game.epaPerPlay, 3)}</td>
              <td className="py-2 pr-3 text-right font-mono">{percent(game.successRate, 0)}</td>
              <td className="py-2 pr-3 text-right font-mono">{round(game.pointsPerDrive, 2)}</td>
              <td className="py-2 pr-0 text-right font-mono">{game.gameControl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeasonAnalysisDashboard({ data }: { data: SeasonAnalysisDashboardData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedMetricKey, setSelectedMetricKey] = useState<DashboardMetricKey>("epaPerPlay");

  const selected = {
    game: searchParams.get("game") ?? ALL,
    opponent: searchParams.get("opponent") ?? ALL,
    quarter: searchParams.get("quarter") ?? ALL,
    down: searchParams.get("down") ?? ALL,
    playType: searchParams.get("playType") ?? ALL,
    redZone: searchParams.get("redZone") ?? ALL,
  };

  const setFilter = (key: keyof typeof selected, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  const activeFilters = Object.values(selected).filter((value) => value !== ALL).length;
  const hasPlayLevelFilters = selected.down !== ALL || selected.playType !== ALL || selected.redZone !== ALL;

  const filteredPlays = useMemo(
    () =>
      data.plays.filter((play) => {
        if (selected.game !== ALL && play.gameId !== selected.game) {
          return false;
        }

        if (selected.opponent !== ALL && play.opponentId !== selected.opponent) {
          return false;
        }

        if (selected.quarter !== ALL && play.quarter !== Number(selected.quarter)) {
          return false;
        }

        if (selected.down !== ALL && play.down !== Number(selected.down)) {
          return false;
        }

        if (selected.playType !== ALL && play.playType !== selected.playType) {
          return false;
        }

        if (selected.redZone !== ALL && String(play.redZone) !== selected.redZone) {
          return false;
        }

        return true;
      }),
    [data.plays, selected.down, selected.game, selected.opponent, selected.playType, selected.quarter, selected.redZone]
  );

  const matchingDriveIds = useMemo(() => new Set(filteredPlays.map((play) => play.driveId)), [filteredPlays]);
  const matchingGameIds = useMemo(() => new Set(filteredPlays.map((play) => play.gameId)), [filteredPlays]);

  const filteredDrives = useMemo(
    () =>
      data.drives.filter((drive) => {
        if (selected.game !== ALL && drive.gameId !== selected.game) {
          return false;
        }

        if (selected.opponent !== ALL && drive.opponentId !== selected.opponent) {
          return false;
        }

        if (selected.quarter !== ALL && drive.quarter !== Number(selected.quarter)) {
          return false;
        }

        if (hasPlayLevelFilters && !matchingDriveIds.has(drive.id)) {
          return false;
        }

        return true;
      }),
    [data.drives, hasPlayLevelFilters, matchingDriveIds, selected.game, selected.opponent, selected.quarter]
  );

  const filteredGames = useMemo(
    () =>
      data.games.filter((game) => {
        if (selected.game !== ALL && game.id !== selected.game) {
          return false;
        }

        if (selected.opponent !== ALL && game.opponentId !== selected.opponent) {
          return false;
        }

        if (hasPlayLevelFilters && !matchingGameIds.has(game.id)) {
          return false;
        }

        return true;
      }),
    [data.games, hasPlayLevelFilters, matchingGameIds, selected.game, selected.opponent]
  );

  const metrics = useMemo(
    () => buildMetricSummaries(filteredPlays, filteredDrives, filteredGames),
    [filteredDrives, filteredGames, filteredPlays]
  );
  const selectedMetric = metrics.find((metric) => metric.key === selectedMetricKey) ?? metrics[0]!;
  const summary = useMemo(() => summarizeFootballSelection(filteredPlays, filteredDrives), [filteredDrives, filteredPlays]);
  const situationCells = useMemo(() => buildSituationMatrix(filteredPlays), [filteredPlays]);
  const fieldSegments = useMemo(() => buildFieldSegments(filteredPlays), [filteredPlays]);
  const sustainability = useMemo(() => buildSustainability(filteredPlays), [filteredPlays]);
  const findings = useMemo(() => buildKeyFindings(filteredPlays, filteredDrives), [filteredDrives, filteredPlays]);

  return (
    <div className="space-y-5">
      <PerformanceNarrative data={{ ...data, plays: filteredPlays, drives: filteredDrives, games: filteredGames }} />
      <div className="chapter-heading"><span>04 / DETAIL</span><h2>Explore the Records</h2></div>
      <section className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="size-4 text-muted-foreground" />
              Global Filters
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Filter state is reflected in the URL so chart views can be shared or restored.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {activeFilters} Active
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SelectFilter label="Game" value={selected.game} allLabel="All Games" options={data.filters.games} onChange={(value) => setFilter("game", value)} />
          <SelectFilter label="Opponent" value={selected.opponent} allLabel="All Opponents" options={data.filters.opponents} onChange={(value) => setFilter("opponent", value)} />
          <SelectFilter label="Quarter" value={selected.quarter} allLabel="All Quarters" options={data.filters.quarters} onChange={(value) => setFilter("quarter", value)} />
          <SelectFilter label="Down" value={selected.down} allLabel="All Downs" options={data.filters.downs} onChange={(value) => setFilter("down", value)} />
          <SelectFilter label="Play Type" value={selected.playType} allLabel="All Play Types" options={data.filters.playTypes} onChange={(value) => setFilter("playType", value)} />
          <SelectFilter label="Field Zone" value={selected.redZone} allLabel="All Zones" options={data.filters.redZone} onChange={(value) => setFilter("redZone", value)} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metrics.slice(0, 10).map((metric) => (
          <MetricTile
            key={metric.key}
            metric={metric}
            selected={selectedMetric.key === metric.key}
            onSelect={() => setSelectedMetricKey(metric.key)}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChartIcon className="size-4 text-muted-foreground" />
                  Season Trend
                </CardTitle>
                <CardDescription>{selectedMetric.label} by game after the selected filters are applied.</CardDescription>
              </div>
              <Badge variant="outline">{selectedMetric.baselineLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <SeasonTrendChart metric={selectedMetric} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              Current View
            </CardTitle>
            <CardDescription>Observed production in the active filter set.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/15 p-3">
                <div className="text-xs text-muted-foreground">Plays</div>
                <div className="mt-1 font-mono text-2xl font-semibold">{summary.plays}</div>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <div className="text-xs text-muted-foreground">Drives</div>
                <div className="mt-1 font-mono text-2xl font-semibold">{summary.drives}</div>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <div className="text-xs text-muted-foreground">Total EPA</div>
                <div className="mt-1 font-mono text-2xl font-semibold">{formatSigned(sustainability.totalEpa, 1)}</div>
              </div>
              <div className="rounded-lg border bg-muted/15 p-3">
                <div className="text-xs text-muted-foreground">Negative Plays</div>
                <div className="mt-1 font-mono text-2xl font-semibold">{percent(sustainability.negativePlayRate, 0)}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Early-Down EPA</span>
                  <span className="font-mono">{formatSigned(sustainability.earlyDownEpa, 3)}</span>
                </div>
                <Progress value={clamp((sustainability.earlyDownEpa + 0.35) * 120, 0, 100)} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Late-Down EPA</span>
                  <span className="font-mono">{formatSigned(sustainability.lateDownEpa, 3)}</span>
                </div>
                <Progress value={clamp((sustainability.lateDownEpa + 0.35) * 120, 0, 100)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListFilter className="size-4 text-muted-foreground" />
              Situational Performance
            </CardTitle>
            <CardDescription>Down and distance splits using success rate, EPA, explosive rate, and sample confidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <SituationGrid cells={situationCells} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Map className="size-4 text-muted-foreground" />
              Field Position Analysis
            </CardTitle>
            <CardDescription>Ball location binned by 10-yard segments. This is not player-tracking data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FootballField segments={fieldSegments} />
            <FieldSegmentChart segments={fieldSegments} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-muted-foreground" />
              Key Findings
            </CardTitle>
            <CardDescription>Statements generated from the selected sample and its observed fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.map((finding) => (
              <div key={finding.label} className={cn("rounded-lg border p-3", findingStyles[finding.status])}>
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{finding.label}</div>
                  <Badge variant="outline" className="font-mono">
                    {finding.value}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="size-4 text-muted-foreground" />
              Drive Analysis
            </CardTitle>
            <CardDescription>Highest-leverage offensive drives by absolute EPA in the active view.</CardDescription>
          </CardHeader>
          <CardContent>
            <DriveAnalysis drives={filteredDrives} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4 text-muted-foreground" />
            Play Explorer
          </CardTitle>
          <CardDescription>Top plays in the active view sorted by absolute EPA impact.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlayExplorer plays={filteredPlays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Game Summary</CardTitle>
          <CardDescription>Game-level production after game and opponent filters are applied.</CardDescription>
        </CardHeader>
        <CardContent>
          <GameTable games={filteredGames} />
        </CardContent>
      </Card>

      <section className="rounded-lg border bg-card p-4">
        <SectionHeader
          icon={AlertCircle}
          title="Methodology and Data Availability"
          description="The page distinguishes available fields from unavailable model outputs."
          badge={data.team.isDemoData ? "Demo Dataset" : "Team Dataset"}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {data.methodologyNotes.map((note) => (
            <div key={note} className="rounded-lg border bg-muted/15 p-3 text-sm leading-6 text-muted-foreground">
              {note}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
