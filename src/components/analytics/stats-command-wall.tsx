"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Crosshair,
  Gauge,
  RadioTower,
  Radar as RadarIcon,
  Shield,
  Signal,
  Target,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { MetricResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useElementSize } from "@/hooks/use-element-size";
import { useIsClient } from "@/hooks/use-is-client";
import { clamp, mean, round, standardDeviation } from "@/lib/math";
import { cn } from "@/lib/utils";

type TrendRow = {
  week: string;
  opponent: string;
  result: string;
  winProbability: number;
  offensiveEpa: number;
  defensiveEpaAllowed: number;
  netEfficiency: number;
  successRate: number;
  explosiveRate: number;
  gameControl: number;
};

type PhaseRow = {
  phase: string;
  label: string;
  netEfficiency: number;
  successRate: number;
  explosiveRate: number;
  gameControl: number;
  winProbability: number;
};

type SituationalRow = {
  segment: string;
  plays: number;
  successRate: number;
  epaPerPlay: number;
  explosiveRate: number;
  reliability: number;
};

type DriveResultRow = {
  result: string;
  label: string;
  count: number;
  epa: number;
  yards: number;
};

type PlayerCommandRow = {
  name: string;
  position: string;
  impactScore: number;
  reliability: number;
  consistency: number;
  epa: number;
  onOffSwing: number;
  grade: number;
};

type OpponentCommandRow = {
  name: string;
  week: number | null;
  cluster: string;
  matchupScore: number;
  pressureStress: number;
  offensiveRisk: number;
};

type RosterCompositionRow = {
  position: string;
  players: number;
  impact: number;
  reliability: number;
  usage: number;
};

export type StatsCommandWallProps = {
  metrics: MetricResult[];
  trendData: TrendRow[];
  phaseData: PhaseRow[];
  situationalRows: SituationalRow[];
  driveRows: DriveResultRow[];
  playerRows: PlayerCommandRow[];
  opponentRows: OpponentCommandRow[];
  rosterRows: RosterCompositionRow[];
};

const chartColors = [
  "oklch(0.82 0.07 160)",
  "oklch(0.74 0.08 205)",
  "oklch(0.78 0.1 82)",
  "oklch(0.69 0.12 24)",
  "oklch(0.72 0.08 285)",
  "oklch(0.7 0.02 250)",
];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
} satisfies CSSProperties;

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

function ResponsiveChart({
  height,
  children,
}: {
  height: number;
  children: (width: number, height: number) => ReactNode;
}) {
  const isClient = useIsClient();
  const { ref, width } = useElementSize<HTMLDivElement>();
  const style = { "--chart-height": `${height}px` } as CSSProperties;

  if (!isClient || width < 20) {
    return <div ref={ref} className="h-[var(--chart-height)] w-full rounded-md border bg-muted/20" style={style} />;
  }

  return (
    <div ref={ref} className="h-[var(--chart-height)] w-full min-w-0" style={style}>
      {children(width, height)}
    </div>
  );
}

function Panel({
  title,
  description,
  badge,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  icon?: typeof BarChart3;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              {Icon && <Icon className="size-4 text-muted-foreground" />}
              <span className="truncate">{title}</span>
            </CardTitle>
            {description && <CardDescription className="mt-1 text-xs leading-5">{description}</CardDescription>}
          </div>
          {badge && (
            <Badge variant="outline" className="font-mono">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 118 + 1;
      const y = 34 - ((value - min) / range) * 30;
      return `${round(x, 1)},${round(y, 1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 120 36" className="h-9 w-full overflow-visible" role="img" aria-label="Metric trend">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricTile({ metric, index }: { metric: MetricResult; index: number }) {
  const edge = metric.value - metric.comparisonAverage;
  const color = chartColors[index % chartColors.length]!;

  return (
    <Card size="sm" className="min-h-[138px]">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-xs">{metric.name}</CardTitle>
          <Badge
            variant="outline"
            className={cn("font-mono", edge >= 0 ? "border-emerald-300/30 text-emerald-200" : "border-amber-300/30 text-amber-200")}
          >
            {edge >= 0 ? "+" : ""}
            {round(edge, 2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-mono text-xl font-semibold">{metric.formattedValue}</div>
        <Sparkline values={metric.trend} color={color} />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Indicator Confidence</span>
          <span className="font-mono">{Math.round(metric.confidence * 100)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function shortMetricName(name: string) {
  return name
    .replace("Expected Points Added", "EPA")
    .replace("Opponent-Adjusted Performance", "Adjusted")
    .replace("Strength-of-Schedule Adjustment", "Schedule")
    .replace("Reliability-Adjusted Player Rating", "Reliability")
    .replace("Explosive Play Rate", "Explosive")
    .replace("Third-Down Efficiency", "3rd Down")
    .replace("Red Zone Efficiency", "Red Zone");
}

function buildRadarData(metrics: MetricResult[]) {
  return metrics.slice(0, 8).map((metric) => {
    const trendDeviation = standardDeviation(metric.trend);
    const stability = clamp(96 - trendDeviation * (Math.abs(metric.value) > 2 ? 1.6 : 42), 28, 98);

    return {
      metric: shortMetricName(metric.name),
      confidence: Math.round(metric.confidence * 100),
      stability: Math.round(stability),
    };
  });
}

function heatmapParts(segment: string) {
  const [downDistance = segment, quarter = "", scoreState = "", zone = ""] = segment.split(" / ");
  return { downDistance, quarter, scoreState, zone };
}

function HeatmapCell({ row }: { row: SituationalRow }) {
  const parts = heatmapParts(row.segment);
  const success = Math.round(row.successRate * 100);
  const hue = row.epaPerPlay >= 0 ? 160 : 28;
  const chroma = clamp(0.025 + Math.abs(row.epaPerPlay) * 0.09, 0.03, 0.14);
  const alpha = clamp(0.2 + row.reliability * 0.58, 0.24, 0.78);
  const style = {
    background: `linear-gradient(135deg, oklch(0.24 ${chroma} ${hue} / ${alpha}), oklch(0.16 0 0 / 0.72))`,
  };

  return (
    <div className="min-h-24 rounded-lg border border-white/10 p-3" style={style}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium">{parts.downDistance}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {parts.quarter} / {parts.zone}
          </div>
        </div>
        <span className="font-mono text-lg font-semibold">{success}%</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{parts.scoreState}</span>
        <span className="font-mono">{row.epaPerPlay >= 0 ? "+" : ""}{row.epaPerPlay} EPA</span>
      </div>
      <Progress className="mt-2 bg-black/25" value={row.reliability * 100} />
    </div>
  );
}

function PlayerRows({ rows }: { rows: PlayerCommandRow[] }) {
  return (
    <div className="space-y-3">
      {rows.slice(0, 7).map((row, index) => (
        <div key={row.name} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border bg-muted/15 p-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">#{String(index + 1).padStart(2, "0")}</span>
              <span className="truncate text-sm font-medium">{row.name}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {row.position}
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
              <Progress value={row.impactScore} />
              <span className="font-mono text-xs">{row.impactScore}</span>
            </div>
          </div>
          <div className="text-right font-mono text-[11px] text-muted-foreground">
            <div>{row.reliability}% rel</div>
            <div>{row.onOffSwing >= 0 ? "+" : ""}{row.onOffSwing} swing</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsCommandWall({
  metrics,
  trendData,
  phaseData,
  situationalRows,
  driveRows,
  playerRows,
  opponentRows,
  rosterRows,
}: StatsCommandWallProps) {
  const spotlightKeys = [
    "game-control",
    "epa",
    "success-rate",
    "explosive-rate",
    "third-down-efficiency",
    "opponent-adjusted",
  ];
  const spotlightMetrics = spotlightKeys
    .map((key) => metrics.find((metric) => metric.key === key))
    .filter((metric): metric is MetricResult => Boolean(metric));
  const latest = trendData.at(-1);
  const averageControl = Math.round(mean(trendData.map((row) => row.gameControl)));
  const averageWinProbability = Math.round(mean(trendData.map((row) => row.winProbability)));
  const radarData = buildRadarData(metrics);
  const topSituations = situationalRows
    .slice()
    .sort((left, right) => right.reliability * right.plays - left.reliability * left.plays)
    .slice(0, 12);
  const drivePieRows = driveRows.map((row) => ({ ...row, value: row.count }));
  const opponentScatterRows = opponentRows.map((row) => ({
    name: row.name,
    pressure: row.pressureStress,
    risk: row.offensiveRisk,
    matchup: row.matchupScore,
    week: row.week ?? 0,
  }));
  const rosterChartRows = rosterRows.slice(0, 9);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {spotlightMetrics.map((metric, index) => (
          <MetricTile key={metric.key} metric={metric} index={index} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <Panel
          title="Season Performance Timeline"
          description="Game control, win probability, and net efficiency on one timeline."
          badge={`${averageControl} Control`}
          icon={Gauge}
        >
          <ResponsiveChart height={350}>
            {(width, height) => (
              <ComposedChart width={width} height={height} data={trendData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="controlGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={42} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--foreground)" }} />
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }} />
                <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4" />
                <Bar dataKey="gameControl" name="Game Control" fill="url(#controlGradient)" radius={[4, 4, 0, 0]} />
                <Area type="monotone" dataKey="netEfficiency" name="Net EPA" fill={chartColors[1]} fillOpacity={0.12} stroke={chartColors[1]} strokeWidth={2} />
                <Line type="monotone" dataKey="winProbability" name="Win Probability" stroke={chartColors[2]} strokeWidth={2.5} dot={{ r: 2 }} />
              </ComposedChart>
            )}
          </ResponsiveChart>
        </Panel>

        <Panel title="Live Snapshot" badge={latest?.week ?? "Live"} icon={Signal}>
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Current Read</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{latest?.opponent ?? "Opponent"}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {latest?.result ?? "W"} / {latest?.winProbability ?? averageWinProbability}% win signal
                  </div>
                </div>
                <div className="font-mono text-3xl font-semibold">{latest?.gameControl ?? averageControl}</div>
              </div>
            </div>
            <ResponsiveChart height={214}>
              {(width, height) => (
                <RadialBarChart width={width} height={height} innerRadius="24%" outerRadius="94%" data={spotlightMetrics.map((metric, index) => ({
                  name: shortMetricName(metric.name),
                  value: Math.round(metric.confidence * 100),
                  fill: chartColors[index % chartColors.length],
                }))} startAngle={210} endAngle={-150}>
                  <RadialBar dataKey="value" background cornerRadius={8} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadialBarChart>
              )}
            </ResponsiveChart>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Phase Efficiency Bands" badge={`${phaseData.length} Bands`} icon={Activity}>
          <ResponsiveChart height={280}>
            {(width, height) => (
              <AreaChart width={width} height={height} data={phaseData} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="phaseSuccess" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="phaseExplosive" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColors[2]} stopOpacity={0.38} />
                    <stop offset="95%" stopColor={chartColors[2]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="phase" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={34} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="successRate" name="Success Rate" stroke={chartColors[0]} fill="url(#phaseSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey="explosiveRate" name="Explosive Rate" stroke={chartColors[2]} fill="url(#phaseExplosive)" strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveChart>
        </Panel>

        <Panel title="Drive Result Distribution" badge={`${driveRows.reduce((total, row) => total + row.count, 0)} Drives`} icon={Target}>
          <ResponsiveChart height={280}>
            {(width, height) => (
              <PieChart width={width} height={height}>
                <Pie data={drivePieRows} dataKey="value" nameKey="label" innerRadius={58} outerRadius={96} paddingAngle={2}>
                  {drivePieRows.map((row, index) => (
                    <Cell key={row.result} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }} />
              </PieChart>
            )}
          </ResponsiveChart>
        </Panel>

        <Panel title="Metric Stability Radar" badge="Confidence" icon={RadarIcon}>
          <ResponsiveChart height={280}>
            {(width, height) => (
              <RadarChart width={width} height={height} data={radarData} outerRadius="74%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Radar dataKey="confidence" name="Confidence" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={0.22} />
                <Radar dataKey="stability" name="Stability" stroke={chartColors[1]} fill={chartColors[1]} fillOpacity={0.12} />
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }} />
              </RadarChart>
            )}
          </ResponsiveChart>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Situational Heatmap" description="High-volume down, distance, quarter, score, and field zones." badge={`${topSituations.length} Cells`} icon={Crosshair}>
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {topSituations.map((row) => (
              <HeatmapCell key={row.segment} row={row} />
            ))}
          </div>
        </Panel>

        <Panel title="Opponent Pressure Map" badge={`${opponentRows.length} Profiles`} icon={Shield}>
          <ResponsiveChart height={408}>
            {(width, height) => (
              <ScatterChart width={width} height={height} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="pressure" name="Pressure Stress" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis type="number" dataKey="risk" name="Offensive Risk" tickLine={false} axisLine={false} tick={axisTick} width={42} />
                <ZAxis type="number" dataKey="matchup" range={[80, 360]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={opponentScatterRows} name="Opponent" fill={chartColors[3]} />
              </ScatterChart>
            )}
          </ResponsiveChart>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel title="Player Impact Stack" badge={`${playerRows.length} Players`} icon={Zap}>
          <PlayerRows rows={playerRows} />
        </Panel>

        <Panel title="Personnel Composition" description="Impact, reliability, and usage by position group." badge={`${rosterRows.length} Groups`} icon={RadioTower}>
          <ResponsiveChart height={360}>
            {(width, height) => (
              <BarChart width={width} height={height} data={rosterChartRows} layout="vertical" margin={{ top: 8, right: 18, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis type="category" dataKey="position" tickLine={false} axisLine={false} tick={axisTick} width={44} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }} />
                <Bar dataKey="impact" name="Impact" fill={chartColors[0]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="reliability" name="Reliability" fill={chartColors[1]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="usage" name="Usage" fill={chartColors[2]} radius={[0, 4, 4, 0]} />
              </BarChart>
            )}
          </ResponsiveChart>
        </Panel>
      </section>
    </div>
  );
}
