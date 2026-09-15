"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMotionPreference as useReducedMotion } from "./use-motion-preference";
import type {
  DashboardPlayRow,
  SeasonAnalysisDashboardData,
} from "@/lib/stats/football-dashboard";
import { summarizeFootballSelection } from "@/lib/stats/football-dashboard";
const colors = ["#82d8b4", "#e9be73", "#89bced"];
const rate = (n: number) => `${(n * 100).toFixed(1)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(3)}`;
export function Trend({
  data,
  active,
}: {
  data: SeasonAnalysisDashboardData;
  active: number;
}) {
  const reduced = useReducedMotion();
  const keys = ["epaPerPlay", "successRate", "explosiveRate"] as const;
  const values = data.games.map(
    (g) =>
      summarizeFootballSelection(
        data.plays.filter((p) => p.gameId === g.id),
        [],
      )[keys[active]],
  );
  const min = active === 0 ? Math.min(0, ...values) - 0.04 : 0;
  const max =
    active === 0
      ? Math.max(0.1, ...values) + 0.04
      : Math.max(0.1, ...values) * 1.15;
  const y = (n: number) => 300 - ((n - min) / (max - min)) * 255;
  const x = (i: number) => 55 + (i / Math.max(1, values.length - 1)) * 690;
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`)
    .join(" ");
  return (
    <div className="trend-visual">
      <div className="visual-caption">
        <span>GAME-BY-GAME PERFORMANCE</span>
        <span>{data.games.length} Games</span>
      </div>
      <svg
        viewBox="0 0 800 365"
        role="img"
        aria-label={`${keys[active]} by game`}
      >
        {values.length === 0 && (
          <text x="400" y="180" fill="#aaa" textAnchor="middle">
            No Matching Games
          </text>
        )}
        {Array.from({ length: 5 }, (_, i) => {
          const n = min + ((max - min) * i) / 4;
          return (
            <g key={i}>
              <line x1="55" x2="745" y1={y(n)} y2={y(n)} stroke="#ffffff16" />
              <text
                x="43"
                y={y(n) + 4}
                textAnchor="end"
                fill="#aaa"
                fontSize="11"
              >
                {active === 0 ? n.toFixed(2) : rate(n)}
              </text>
            </g>
          );
        })}
        <motion.path
          initial={{
            d: path,
            stroke: colors[active],
            pathLength: reduced ? 1 : 0,
          }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          animate={{ d: path, stroke: colors[active] }}
          transition={{ duration: reduced ? 0 : 0.65 }}
          fill="none"
          strokeWidth="3"
        />
        {values.map((v, i) => (
          <motion.circle
            key={data.games[i].id}
            initial={{ cx: x(i), cy: y(v), fill: colors[active], opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            animate={{ cx: x(i), cy: y(v), fill: colors[active] }}
            transition={{ duration: reduced ? 0 : 0.5 }}
            r="3.5"
          >
            <title>{`${data.games[i].label}: ${active === 0 ? signed(v) : rate(v)}`}</title>
          </motion.circle>
        ))}
        {data.games
          .filter((_, i) => i % 5 === 0)
          .map((g) => (
            <text
              key={g.id}
              x={x(data.games.indexOf(g))}
              y="336"
              fill="#aaa"
              fontSize="11"
              textAnchor="middle"
            >
              W{g.week}
            </text>
          ))}
      </svg>
      <p className="visual-note">
        Each point represents one game. Rates use the offensive play sample for
        that game.
      </p>
    </div>
  );
}

export function Field({
  plays,
  active,
  gameId,
}: {
  plays: DashboardPlayRow[];
  active: number;
  gameId: string;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<DashboardPlayRow | null>(null);
  const matches = (p: DashboardPlayRow) =>
    active === 0 ||
    (active === 1
      ? p.success
      : active === 2
        ? p.explosive
        : active === 3
          ? p.down === 3
          : active === 4
            ? p.redZone
            : p.gameId === gameId);
  // Aggregate by recorded yard line and down; no lateral tracking position is inferred.
  const bins = useMemo(() => {
    const grouped = new Map<string, DashboardPlayRow[]>();
    plays.forEach((p) => {
      const key = `${p.down}-${Math.floor(p.yardLine / 5)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), p]);
    });
    return [...grouped.entries()];
  }, [plays]);
  const count = plays.filter(matches).length;
  return (
    <div className="field-visual">
      <div className="visual-caption">
        <span>OFFENSIVE FIELD POSITION</span>
        <span>{count.toLocaleString("en-US")} Plays</span>
      </div>
      <svg
        viewBox="0 0 1000 530"
        role="img"
        aria-label="Play density by yard line and down"
      >
        <rect
          x="15"
          y="15"
          width="970"
          height="500"
          fill="#254f39"
          stroke="#dce4db"
          strokeWidth="2"
        />
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            key={i}
            x={95 + i * 81}
            y="16"
            width="81"
            height="498"
            fill={i % 2 ? "#2d5a41" : "#315f45"}
          />
        ))}
        {Array.from({ length: 21 }, (_, i) => (
          <line
            key={i}
            x1={95 + i * 40.5}
            x2={95 + i * 40.5}
            y1="16"
            y2="514"
            stroke={i % 2 ? "#ffffff35" : "#ffffffa0"}
            strokeWidth={i % 2 ? 1 : 2}
          />
        ))}
        {Array.from({ length: 99 }, (_, i) => (
          <g key={i} stroke="#ffffff95">
            {[185, 340].map((y) => (
              <line
                key={y}
                x1={95 + (i + 1) * 8.1}
                x2={95 + (i + 1) * 8.1}
                y1={y}
                y2={y + 7}
              />
            ))}
          </g>
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <g
            key={i}
            fill="#ffffffa0"
            fontSize="23"
            fontFamily="monospace"
            textAnchor="middle"
          >
            <text x={176 + i * 81} y="60">
              {Math.min(i + 1, 9 - i) * 10}
            </text>
            <text x={176 + i * 81} y="486">
              {Math.min(i + 1, 9 - i) * 10}
            </text>
          </g>
        ))}
        <text
          transform="translate(59 265) rotate(-90)"
          textAnchor="middle"
          fill="#ffffffbb"
          fontSize="17"
        >
          MOUNT OLIVE
        </text>
        <text
          transform="translate(953 265) rotate(90)"
          textAnchor="middle"
          fill="#ffffffbb"
          fontSize="17"
        >
          OPPONENT
        </text>
        {[1, 2, 3, 4].map((d) => (
          <text key={d} x="104" y={103 + d * 70} fill="#fff" fontSize="12">
            D{d}
          </text>
        ))}
        {bins.map(([key, rows], i) => {
          const selected = rows.filter(matches);
          const p = selected[0] ?? rows[0];
          const n = selected.length;
          return (
            <motion.circle
              key={key}
              cx={95 + (Math.floor(p.yardLine / 5) * 5 + 2.5) * 8.1}
              cy={99 + p.down * 70}
              initial={{ r: 3, opacity: 0, scale: reduced ? 1 : 0.4 }}
              whileInView={{ opacity: n ? 0.88 : 0.07, scale: n ? 1 : 0.5 }}
              viewport={{ once: true }}
              animate={{ r: 3 + Math.sqrt(n) * 1.35 }}
              transition={{
                duration: reduced ? 0 : 0.4,
                delay: reduced ? 0 : i * 0.002,
              }}
              fill={active === 2 ? "#edc982" : "#bcebd6"}
              stroke="#102f23"
              strokeWidth="1"
              tabIndex={n ? 0 : -1}
              onMouseEnter={() => setHovered(p)}
              onFocus={() => setHovered(p)}
              onBlur={() => setHovered(null)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`${n} plays, down ${p.down}, yard line ${Math.floor(p.yardLine / 5) * 5}`}
            >
              <title>{`${n} Plays / Down ${p.down} / Yard Line ${Math.floor(p.yardLine / 5) * 5}-${Math.floor(p.yardLine / 5) * 5 + 4}`}</title>
            </motion.circle>
          );
        })}
      </svg>
      <div className="field-detail">
        {hovered
          ? `Example: W${hovered.week} vs ${hovered.opponent} / ${hovered.playTypeLabel} / ${hovered.yardsGained} Yards / ${signed(hovered.epa)} EPA`
          : "Ball position in five-yard bins. Rows indicate down; marker area reflects play count."}
      </div>
    </div>
  );
}
