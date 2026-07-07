"use client";

import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useElementSize } from "@/hooks/use-element-size";
import { useIsClient } from "@/hooks/use-is-client";

export function AnalyticsBarChart({
  data,
  xKey,
  yKey,
  height = 260,
  color = "var(--chart-1)",
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
}) {
  const isClient = useIsClient();
  const { ref, width } = useElementSize<HTMLDivElement>();
  const style = { "--chart-height": `${height}px` } as CSSProperties;

  if (!isClient || width < 20) {
    return <div ref={ref} className="h-[var(--chart-height)] w-full min-w-0 rounded-md border bg-muted/20" style={style} />;
  }

  return (
    <div ref={ref} className="h-[var(--chart-height)] w-full min-w-0" style={style}>
        <BarChart width={width} height={height} data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
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
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
    </div>
  );
}
