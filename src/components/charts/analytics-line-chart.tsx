"use client";

import type { CSSProperties } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useElementSize } from "@/hooks/use-element-size";
import { useIsClient } from "@/hooks/use-is-client";

interface SeriesConfig {
  key: string;
  label: string;
  color?: string;
}

export function AnalyticsLineChart({
  data,
  series,
  xKey = "week",
  height = 280,
}: {
  data: Array<Record<string, string | number>>;
  series: SeriesConfig[];
  xKey?: string;
  height?: number;
}) {
  const isClient = useIsClient();
  const { ref, width } = useElementSize<HTMLDivElement>();
  const style = { "--chart-height": `${height}px` } as CSSProperties;

  if (!isClient || width < 20) {
    return <div ref={ref} className="h-[var(--chart-height)] w-full min-w-0 rounded-md border bg-muted/20" style={style} />;
  }

  return (
    <div ref={ref} className="h-[var(--chart-height)] w-full min-w-0" style={style}>
        <LineChart width={width} height={height} data={data} margin={{ top: 12, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }} />
          {series.map((item, index) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color ?? `var(--chart-${(index % 5) + 1})`}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
    </div>
  );
}
