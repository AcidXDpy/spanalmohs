"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, Pause, Play } from "lucide-react";
import {
  editorialMedia,
  type EditorialPhoto,
} from "@/lib/data/editorial-media";
import {
  summarizeFootballSelection,
  type SeasonAnalysisDashboardData,
} from "@/lib/stats/football-dashboard";
import { useMotionPreference } from "./use-motion-preference";
import { Field, Trend } from "./performance-visuals";

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(3)}`;
const mobileQuery = "(max-width: 760px)";
const subscribeReady = () => () => {};
function subscribeMobile(callback: () => void) {
  const m = matchMedia(mobileQuery);
  m.addEventListener("change", callback);
  return () => m.removeEventListener("change", callback);
}
type SceneState = {
  active: number;
  progress: MotionValue<number>;
  staticView: boolean;
};

function Scene({
  id,
  index,
  title,
  stages,
  photo,
  staticView,
  children,
}: {
  id: string;
  index: string;
  title: string;
  stages: string[];
  photo?: EditorialPhoto | null;
  staticView: boolean;
  children: (state: SceneState) => React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!staticView)
      setActive(Math.min(stages.length - 1, Math.floor(v * stages.length)));
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const clipPath = useTransform(
    scrollYProgress,
    [0, 0.35, 0.8, 1],
    [
      "inset(0% 0% 0% 0%)",
      "inset(0% 0% 0% 0%)",
      "inset(0% 100% 0% 0%)",
      "inset(0% 100% 0% 0%)",
    ],
  );
  const filter = useTransform(
    scrollYProgress,
    [0, 0.65],
    ["saturate(1)", "saturate(0.15)"],
  );
  return (
    <section
      ref={ref}
      id={id}
      className="cinema-scene"
      data-static={staticView}
      aria-label={title}
    >
      <div className="cinema-pin">
        {photo && (
          <motion.div
            className="cinema-photo"
            style={staticView ? { opacity: 0.22, scale: 1, clipPath: "inset(0%)", filter: "none" } : { opacity: 1, scale, clipPath, filter }}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="100vw"
              style={{
                objectFit: "cover",
                objectPosition: photo.objectPosition ?? "center",
              }}
            />
          </motion.div>
        )}
        <div className="cinema-topline">
          <span>
            {index} / {title}
          </span>
          <span>
            {photo ? photo.credit : "Mount Olive / Demonstration Data"}
          </span>
        </div>
        {children({ active, progress: scrollYProgress, staticView })}
        <div className="cinema-stages" aria-label={`${title} Progress`}>
          {stages.map((stage, i) =>
            staticView ? (
              <button
                key={stage}
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                <span>0{i + 1}</span>
                {stage}
              </button>
            ) : (
              <div key={stage} data-active={i === active}>
                <span>0{i + 1}</span>
                {stage}
              </div>
            ),
          )}
        </div>
        {!staticView && (
          <motion.div
            className="cinema-scroll-line"
            style={{ scaleX: scrollYProgress }}
          />
        )}
      </div>
    </section>
  );
}

function SeasonScene({
  data,
  state,
}: {
  data: SeasonAnalysisDashboardData;
  state: SceneState;
}) {
  const summary = summarizeFootballSelection(data.plays, data.drives);
  const titleY = useTransform(state.progress, [0, 0.55], [0, -38]);
  const graphOpacity = useTransform(state.progress, [0.15, 0.5], [0.12, 1]);
  const graphY = useTransform(state.progress, [0, 0.55], [70, 0]);
  const graphClip = useTransform(
    state.progress,
    [0.15, 0.65],
    ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"],
  );
  return (
    <div className="cinema-season-content">
      <motion.div
        className="cinema-season-heading"
        style={{ y: state.staticView ? 0 : titleY }}
      >
        <p>
          {String(data.team.season).match(/\d{4}(?:-\d{4})?/)?.[0]} Performance
          Analysis
        </p>
        <h1>
          Mount Olive
          <br />
          Football
        </h1>
        <div className="cinema-headline-metrics">
          <div>
            <strong>{signed(summary.epaPerPlay)}</strong>
            <span>EPA / Play</span>
          </div>
          <div>
            <strong>{percent(summary.successRate)}</strong>
            <span>Success Rate</span>
          </div>
          <div>
            <strong>{data.plays.length.toLocaleString("en-US")}</strong>
            <span>Plays Analyzed</span>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="cinema-season-graph"
        style={
          state.staticView
            ? { opacity: 1, y: 0, clipPath: "inset(0%)" }
            : { opacity: graphOpacity, y: graphY, clipPath: graphClip }
        }
      >
        <Trend data={data} active={Math.max(0, state.active - 1)} />
      </motion.div>
      <div className="cinema-context">
        <ArrowDown size={15} />
        <span>
          {data.games.length} Games. {data.drives.length} Offensive Drives. A
          Season in Context.
        </span>
      </div>
    </div>
  );
}

function PlayScene({
  data,
  state,
}: {
  data: SeasonAnalysisDashboardData;
  state: SceneState;
}) {
  const filter = [0, 1, 2, 3][state.active];
  const selected = data.plays.filter(
    (p) =>
      filter === 0 ||
      (filter === 1 ? p.success : filter === 2 ? p.explosive : p.down === 3),
  );
  const summary = summarizeFootballSelection(selected, []);
  const reveal = useTransform(
    state.progress,
    [0, 0.5],
    ["inset(0% 95% 0% 0%)", "inset(0% 0% 0% 0%)"],
  );
  const fieldScale = useTransform(state.progress, [0, 0.5], [0.94, 1]);
  return (
    <div className="cinema-play-content">
      <div className="cinema-split-heading">
        <div>
          <p>Position. Situation. Outcome.</p>
          <h2>
            {
              [
                "The Field of Play",
                "Sustaining Possession",
                "Creating Separation",
                "Third-Down Execution",
              ][state.active]
            }
          </h2>
        </div>
        <div className="cinema-aside-metric">
          <strong>{signed(summary.epaPerPlay)}</strong>
          <span>EPA / Play in This Sample</span>
        </div>
      </div>
      <motion.div
        className="cinema-field-stage"
        style={state.staticView ? { scale: 1, clipPath: "inset(0%)" } : { scale: fieldScale, clipPath: reveal }}
      >
        <Field plays={data.plays} active={filter} gameId="" />
      </motion.div>
      <p className="cinema-interpretation">
        {selected.length.toLocaleString("en-US")} Plays /{" "}
        {percent(summary.successRate)} Success. Recorded ball positions grouped
        by down; no player-tracking coordinates are inferred.
      </p>
    </div>
  );
}

function buildPlayerRows(data: SeasonAnalysisDashboardData) {
  const groups = new Map<string, typeof data.plays>();
  for (const play of data.plays) {
    if (!play.playerId) continue;
    const rows = groups.get(play.playerId) ?? [];
    rows.push(play);
    groups.set(play.playerId, rows);
  }
  return [...groups.entries()]
    .map(([id, plays]) => ({
      id,
      name: plays[0].playerName,
      plays: plays.length,
      epa: plays.reduce((n, p) => n + p.epa, 0),
      summary: summarizeFootballSelection(plays, []),
      thirds: plays.filter((p) => p.down === 3).length,
    }))
    .sort((a, b) => b.plays - a.plays);
}
type PlayerRow = ReturnType<typeof buildPlayerRows>[number];
function PlayerScene({
  rows,
  state,
}: {
  rows: PlayerRow[];
  state: SceneState;
}) {
  const player = rows[0];
  const opacity = useTransform(state.progress, [0.45, 0.82], [0, 1]);
  const profileOpacity = useTransform(state.progress, [0.4, 0.8], [1, 0.12]);
  const x = (n: number) =>
    65 + (n / Math.max(1, ...rows.map((r) => r.plays))) * 690;
  const min = Math.min(0, ...rows.map((r) => r.summary.epaPerPlay));
  const max = Math.max(0.1, ...rows.map((r) => r.summary.epaPerPlay));
  const y = (n: number) => 345 - ((n - min) / (max - min)) * 285;
  if (!player)
    return (
      <div className="cinema-empty">No Player Records in This Selection</div>
    );
  const values = [
    String(player.plays),
    signed(player.summary.epaPerPlay),
    player.thirds ? percent(player.summary.thirdDownSuccessRate) : "N/A",
    percent(player.summary.successRate),
  ];
  const labels = [
    "Attributed Plays",
    "EPA / Attributed Play",
    "Third-Down Success",
    "Success Rate",
  ];
  return (
    <div className="cinema-player-content">
      <div className="cinema-player-copy">
        <p>Featured Player / Highest Recorded Usage</p>
        <h2>{player.name}</h2>
        <div className="cinema-large-number">{values[state.active]}</div>
        <span>{labels[state.active]}</span>
        <p className="cinema-interpretation">
          {state.active === 2
            ? `${player.thirds} attributed third-down plays. Small samples should be interpreted cautiously.`
            : `${signed(player.epa)} Total EPA across ${player.plays} attributed plays. This describes recorded involvement, not isolated causal impact.`}
        </p>
      </div>
      <div className="cinema-player-visual">
        <motion.div
          className="player-profile-mark"
          style={{ opacity: state.staticView ? 0.13 : profileOpacity }}
          aria-hidden="true"
        >
          <span>
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <small>{player.plays} Attributed Plays</small>
        </motion.div>
        <motion.div
          className="cinema-scatter"
          style={{ opacity: state.staticView ? 1 : opacity }}
        >
          <div className="visual-caption">
            <span>Usage and Efficiency</span>
            <span>{rows.length} Players</span>
          </div>
          <svg
            viewBox="0 0 800 410"
            role="img"
            aria-label="Player attributed plays versus EPA per play"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line
                  x1="65"
                  x2="755"
                  y1={60 + i * 71.25}
                  y2={60 + i * 71.25}
                  stroke="#ffffff20"
                />
                <text
                  x="50"
                  y={65 + i * 71.25}
                  textAnchor="end"
                  fill="#aaa"
                  fontSize="12"
                >
                  {(max - ((max - min) * i) / 4).toFixed(2)}
                </text>
                <text
                  x={65 + i * 172.5}
                  y="372"
                  textAnchor="middle"
                  fill="#aaa"
                  fontSize="12"
                >
                  {Math.round(
                    (Math.max(1, ...rows.map((r) => r.plays)) * i) / 4,
                  )}
                </text>
              </g>
            ))}
            {rows.map((r) => (
              <circle
                key={r.id}
                cx={x(r.plays)}
                cy={y(r.summary.epaPerPlay)}
                r={r.id === player.id ? 11 : 5}
                fill={r.id === player.id ? "#e5bd73" : "#8db8cc"}
                opacity={r.id === player.id ? 1 : 0.65}
                tabIndex={0}
              >
                <title>{`${r.name}: ${r.plays} Plays / ${signed(r.summary.epaPerPlay)} EPA per Play`}</title>
              </circle>
            ))}
            <text x="405" y="404" textAnchor="middle" fill="#aaa" fontSize="12">
              Attributed Plays
            </text>
            <text
              x={Math.min(630, x(player.plays))}
              y={Math.max(30, y(player.summary.epaPerPlay) - 22)}
              fill="#e5bd73"
              fontSize="14"
            >
              {player.name}
            </text>
          </svg>
          <p className="visual-note">
            Vertical axis: EPA / Attributed Play. The featured player is
            highlighted.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function OpponentScene({
  data,
  state,
}: {
  data: SeasonAnalysisDashboardData;
  state: SceneState;
}) {
  const rows = useMemo(
    () =>
      data.filters.opponents
        .map((opponent) => {
          const plays = data.plays.filter(
            (p) => p.opponentId === opponent.value,
          );
          return {
            ...opponent,
            summary: summarizeFootballSelection(plays, []),
            games: data.games.filter((g) => g.opponentId === opponent.value)
              .length,
          };
        })
        .filter((r) => r.summary.plays > 0)
        .sort((a, b) => b.summary.plays - a.summary.plays),
    [data],
  );
  const opacity = useTransform(state.progress, [0.25, 0.65], [0.1, 1]);
  const offset = useTransform(state.progress, [0.2, 0.65], [35, 0]);
  const featured = rows[0];
  if (!featured)
    return (
      <div className="cinema-empty">No Opponent Records in This Selection</div>
    );
  return (
    <div className="cinema-opponent-content">
      <div className="cinema-split-heading">
        <div>
          <p>Opponent Context / Largest Play Sample</p>
          <h2>
            Mount Olive
            <br />
            <span className="cinema-muted">vs {featured.label}</span>
          </h2>
        </div>
        <div className="cinema-aside-metric">
          <strong>
            {state.active < 2
              ? signed(featured.summary.epaPerPlay)
              : percent(featured.summary.successRate)}
          </strong>
          <span>{state.active < 2 ? "EPA / Play" : "Success Rate"}</span>
        </div>
      </div>
      <motion.div
        className="cinema-matrix"
        style={state.staticView ? { opacity: 1, y: 0 } : { opacity, y: offset }}
      >
        <div className="matchup-row matchup-head">
          <span>Opponent</span>
          <span>EPA / Play</span>
          <span>Success</span>
          <span>Explosive</span>
          <span>Plays</span>
        </div>
        {rows.slice(0, 7).map((r) => (
          <div className="matchup-row" key={r.value}>
            <span>
              {r.label}
              <small>{r.games} Games</small>
            </span>
            {[
              r.summary.epaPerPlay,
              r.summary.successRate,
              r.summary.explosiveRate,
            ].map((v, i) => (
              <span
                key={i}
                className="matchup-value"
                style={{
                  backgroundColor: `rgb(${i === 0 ? "105 184 159" : i === 1 ? "108 153 190" : "193 155 86"} / ${0.08 + Math.min(1, Math.abs(v)) * 0.3})`,
                }}
              >
                {i === 0 ? signed(v) : percent(v)}
              </span>
            ))}
            <span>{r.summary.plays}</span>
          </div>
        ))}
      </motion.div>
      <p className="cinema-interpretation">
        Mount Olive offensive production against each opponent. These are
        observed splits, without opponent-strength adjustment.
      </p>
    </div>
  );
}

function SeasonGames({
  data,
  staticView,
}: {
  data: SeasonAnalysisDashboardData;
  staticView: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, (v) => -v * distance);
  useEffect(() => {
    const update = () =>
      setDistance(
        Math.max(
          0,
          (trackRef.current?.scrollWidth ?? 0) -
            (windowRef.current?.clientWidth ?? 0),
        ),
      );
    const observer = new ResizeObserver(update);
    if (windowRef.current) observer.observe(windowRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    update();
    return () => observer.disconnect();
  }, [data.games.length]);
  const games = data.games.slice(-6);
  return (
    <section
      ref={ref}
      className="cinema-games"
      data-static={staticView}
      aria-label="Season Game Sequence"
    >
      <div className="cinema-games-pin">
        <div className="cinema-topline">
          <span>05 / Game Sequence</span>
          <span>Most Recent {games.length} Games</span>
        </div>
        <h2>The Season, Game by Game</h2>
        <div
          ref={windowRef}
          className="cinema-games-window"
          tabIndex={staticView ? 0 : -1}
          aria-label="Game summaries"
        >
          <motion.div
            ref={trackRef}
            className="cinema-games-track"
            style={{ x: staticView ? 0 : x }}
          >
            {games.map((g) => {
              const plays = data.plays.filter((p) => p.gameId === g.id);
              const summary = summarizeFootballSelection(plays, []);
              const keyPlay = plays.slice().sort((a, b) => b.epa - a.epa)[0];
              const photo = editorialMedia.games[g.id];
              const points = plays
                .map(
                  (p, i) =>
                    `${(i / Math.max(1, plays.length - 1)) * 300},${75 - Math.max(-3, Math.min(3, p.epa)) * 20}`,
                )
                .join(" ");
              return (
                <article key={g.id} className="cinema-game-panel">
                  {photo && (
                    <div className="cinema-game-photo">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes="400px"
                        style={{
                          objectFit: "cover",
                          objectPosition: photo.objectPosition,
                        }}
                      />
                    </div>
                  )}
                  <p>
                    Week {g.week} / {g.result}
                  </p>
                  <h3>{g.opponent}</h3>
                  <div className="game-score">{g.score}</div>
                  <svg
                    viewBox="0 0 300 150"
                    role="img"
                    aria-label={`${g.opponent} play-by-play EPA`}
                  >
                    <line x1="0" x2="300" y1="75" y2="75" stroke="#ffffff30" />
                    <polyline
                      points={points}
                      stroke="#9bcbbd"
                      fill="none"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="game-numbers">
                    <div>
                      <strong>{signed(summary.epaPerPlay)}</strong>
                      <span>EPA / Play</span>
                    </div>
                    <div>
                      <strong>{percent(summary.successRate)}</strong>
                      <span>Success</span>
                    </div>
                  </div>
                  <p className="game-key-play">
                    {keyPlay
                      ? `Highest EPA: ${keyPlay.playTypeLabel}, ${keyPlay.yardsGained} Yards / ${signed(keyPlay.epa)} EPA`
                      : "No Plays in This Selection"}
                  </p>
                </article>
              );
            })}
          </motion.div>
        </div>
        <p className="cinema-interpretation">
          Play-by-play EPA traces connect each result to the offensive sample.
        </p>
      </div>
    </section>
  );
}

export function CinematicAnalysis({
  data,
  only,
}: {
  data: SeasonAnalysisDashboardData;
  only?: "player" | "opponent";
}) {
  const systemReduced = useMotionPreference();
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => matchMedia(mobileQuery).matches,
    () => false,
  );
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const reduced = motionOverride ?? systemReduced;
  const staticView = !ready || reduced || mobile;
  const players = useMemo(() => buildPlayerRows(data), [data]);
  const opponent = data.filters.opponents
    .slice()
    .sort(
      (a, b) =>
        data.plays.filter((p) => p.opponentId === b.value).length -
        data.plays.filter((p) => p.opponentId === a.value).length,
    )[0];
  return (
    <div className="cinematic-analysis">
      <div className="cinema-motion-control">
        <span>{only ? "Performance Study" : "Season Analysis"}</span>
        <button
          type="button"
          onClick={() => setMotionOverride(!reduced)}
          aria-label={
            reduced ? "Enable Scroll Animation" : "Pause Scroll Animation"
          }
          title={reduced ? "Enable Scroll Animation" : "Pause Scroll Animation"}
        >
          {reduced ? <Play size={15} /> : <Pause size={15} />}
          <span>{reduced ? "Enable Animation" : "Pause Animation"}</span>
        </button>
      </div>
      {!only && (
        <>
          <Scene
            id="season-performance"
            index="01"
            title="Season Introduction"
            stages={[
              "Season Overview",
              "Scoring Value",
              "Success Rate",
              "Explosive Rate",
            ]}
            photo={editorialMedia.season}
            staticView={staticView}
          >
            {(state) => <SeasonScene data={data} state={state} />}
          </Scene>
          <Scene
            id="play-analysis"
            index="02"
            title="Play Analysis"
            stages={[
              "All Plays",
              "Successful Plays",
              "Explosive Plays",
              "Third Downs",
            ]}
            photo={editorialMedia.play}
            staticView={staticView}
          >
            {(state) => <PlayScene data={data} state={state} />}
          </Scene>
        </>
      )}
      {only !== "opponent" && (
        <Scene
          id="player-performance"
          index="03"
          title="Player Performance"
          stages={["Usage", "Efficiency", "Third Down", "Player Comparison"]}
          photo={players[0] ? editorialMedia.players[players[0].id] : null}
          staticView={staticView}
        >
          {(state) => <PlayerScene rows={players} state={state} />}
        </Scene>
      )}
      {only !== "player" && (
        <Scene
          id="opponent-analysis"
          index="04"
          title="Opponent Analysis"
          stages={["Matchup", "Scoring Value", "Success", "Comparison"]}
          photo={opponent ? editorialMedia.opponents[opponent.value] : null}
          staticView={staticView}
        >
          {(state) => <OpponentScene data={data} state={state} />}
        </Scene>
      )}
      {!only && <SeasonGames data={data} staticView={staticView} />}
    </div>
  );
}
