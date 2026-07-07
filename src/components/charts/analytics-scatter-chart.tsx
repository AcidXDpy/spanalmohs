"use client";

import type { CSSProperties } from "react";
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useElementSize } from "@/hooks/use-element-size";
import { useIsClient } from "@/hooks/use-is-client";

export function AnalyticsScatterChart({
  data,
  xKey,
  yKey,
  zKey,
  height = 280,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  zKey?: string;
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
        <ScatterChart width={width} height={height} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey={xKey}
            name={xKey.replaceAll("_", " ")}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey={yKey}
            name={yKey.replaceAll("_", " ")}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={42}
          />
          {zKey && <ZAxis type="number" dataKey={zKey} range={[60, 220]} />}
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Scatter data={data} fill="var(--chart-1)" />
        </ScatterChart>
    </div>
  );
}
