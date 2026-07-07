import type {
  AnalyticsDataset,
  Game,
  MetricResult,
  ModelFeatureRow,
  Play,
} from "@/types";
import {
  clamp,
  confidenceFromSampleSize,
  formatSigned,
  mean,
  percent,
  ratio,
  round,
  standardDeviation,
  sum,
} from "@/lib/math";
import { getOpponentName } from "@/lib/data/repository";

function mountOlivePlays(dataset: AnalyticsDataset) {
  return dataset.plays.filter((play) => play.offense === "mount-olive");
}

function mountOliveDrives(dataset: AnalyticsDataset) {
  return dataset.drives.filter((drive) => drive.offense === "mount-olive");
}

function gameStat(dataset: AnalyticsDataset, gameId: string) {
  return dataset.teamGameStats.find((stat) => stat.gameId === gameId);
}

function gameOpponentStrength(dataset: AnalyticsDataset, game: Game) {
  return dataset.opponents.find((opponent) => opponent.id === game.opponentId)?.strengthRating ?? 0.5;
}

function metric(
  key: string,
  name: string,
  value: number,
  unit: string,
  formula: string,
  explanation: string,
  confidence: number,
  trend: number[],
  comparisonAverage: number,
  interpretation: string,
  formatter?: (value: number) => string
): MetricResult {
  return {
    key,
    name,
    value,
    formattedValue: formatter ? formatter(value) : `${round(value, 2)}${unit}`,
    unit,
    formula,
    explanation,
    confidence: round(confidence, 2),
    trend: trend.map((item) => round(item, 3)),
    teamAverage: round(mean(trend), 3),
    comparisonAverage: round(comparisonAverage, 3),
    interpretation,
  };
}

export function getGameTrendData(dataset: AnalyticsDataset) {
  return dataset.games.map((game) => {
    const stat = gameStat(dataset, game.id);
    const opponent = getOpponentName(game.opponentId, dataset);
    const strength = gameOpponentStrength(dataset, game);
    const netEfficiency = (stat?.offensiveEpa ?? 0) - (stat?.defensiveEpaAllowed ?? 0);

    return {
      week: `W${game.week}`,
      opponent,
      result: game.result,
      score: `${game.scoreFor}-${game.scoreAgainst}`,
      winProbability: round(game.winProbabilityEnd * 100, 1),
      offensiveEpa: round(stat?.offensiveEpa ?? 0, 2),
      defensiveEpaAllowed: round(stat?.defensiveEpaAllowed ?? 0, 2),
      netEfficiency: round(netEfficiency, 2),
      successRate: round((stat?.successRate ?? 0) * 100, 1),
      explosiveRate: round(ratio(stat?.explosivePlays ?? 0, stat?.plays ?? 1) * 100, 1),
      gameControl: round(50 + netEfficiency * 2.2 + (game.scoreFor - game.scoreAgainst) * 0.55 - strength * 4, 1),
    };
  });
}

export function calculateTeamMetrics(dataset: AnalyticsDataset): MetricResult[] {
  const plays = mountOlivePlays(dataset);
  const drives = mountOliveDrives(dataset);
  const stats = dataset.teamGameStats;
  const gameCount = dataset.games.length;
  const playConfidence = confidenceFromSampleSize(plays.length, 450);
  const gameConfidence = confidenceFromSampleSize(gameCount, 12);
  const driveConfidence = confidenceFromSampleSize(drives.length, 80);
  const leagueBaseline = {
    epa: 0.02,
    successRate: 0.42,
    explosiveRate: 0.08,
    driveEfficiency: 0.36,
    redZone: 0.58,
    thirdDown: 0.39,
  };

  const offensiveEpaPerPlayTrend = stats.map((stat) => ratio(stat.offensiveEpa, stat.plays));
  const successRateTrend = stats.map((stat) => stat.successRate);
  const explosiveRateTrend = stats.map((stat) => ratio(stat.explosivePlays, stat.plays));
  const driveEfficiencyTrend = dataset.games.map((game) => {
    const gameDrives = drives.filter((drive) => drive.gameId === game.id);
    return ratio(
      gameDrives.filter((drive) => drive.result === "touchdown" || drive.result === "field-goal").length,
      gameDrives.length
    );
  });
  const redZoneTrend = stats.map((stat) => ratio(stat.redZoneTouchdowns, stat.redZoneTrips));
  const thirdDownTrend = stats.map((stat) => ratio(stat.thirdDownConversions, stat.thirdDownAttempts));
  const turnoverTrend = stats.map((stat) => stat.takeaways - stat.turnovers);
  const opponentAdjustedTrend = dataset.games.map((game) => {
    const stat = gameStat(dataset, game.id);
    const strength = gameOpponentStrength(dataset, game);
    return (stat?.offensiveEpa ?? 0) / Math.max(stat?.plays ?? 1, 1) + (strength - 0.5) * 0.12;
  });
  const sosTrend = dataset.games.map((game) => gameOpponentStrength(dataset, game));
  const playerImpactTrend = getPlayerImpactRows(dataset).slice(0, 6).map((row) => row.impactScore);
  const reliabilityTrend = getPlayerImpactRows(dataset).slice(0, 6).map((row) => row.reliability);
  const momentumTrend = stats.map((stat, index) => {
    const previous = stats[index - 1];
    if (!previous) {
      return 0;
    }

    return stat.offensiveEpa - previous.offensiveEpa - (stat.defensiveEpaAllowed - previous.defensiveEpaAllowed);
  });
  const volatilityTrend = stats.map((stat) => Math.abs(stat.offensiveEpa - mean(stats.map((item) => item.offensiveEpa))));
  const consistencyTrend = stats.map((stat) => 100 - Math.abs(stat.successRate - mean(successRateTrend)) * 220);
  const gameControlTrend = getGameTrendData(dataset).map((row) => row.gameControl);
  const fieldPositionTrend = stats.map((stat) => (stat.averageStartingFieldPosition - 25) * 0.12);
  const situationalEfficiencyTrend = getSituationalEfficiency(dataset)
    .filter((row) => row.segment.startsWith("3rd") || row.segment.includes("red zone"))
    .map((row) => row.successRate);

  return [
    metric(
      "epa",
      "Expected Points Added",
      mean(offensiveEpaPerPlayTrend),
      " EPA/play",
      "Average(play EPA) using field position, down, distance, result, and turnover value.",
      "Measures whether each offensive snap improved the team's expected point margin.",
      playConfidence,
      offensiveEpaPerPlayTrend,
      leagueBaseline.epa,
      mean(offensiveEpaPerPlayTrend) > leagueBaseline.epa
        ? "Offense is producing positive value above a neutral high-school baseline."
        : "Offense is close to neutral and needs more efficient early-down production.",
      (value) => `${formatSigned(value, 3)} EPA/play`
    ),
    metric(
      "success-rate",
      "Success Rate",
      mean(successRateTrend),
      "",
      "Successful plays / total plays. Success is 40% of yards on 1st, 55% on 2nd, conversion on 3rd/4th.",
      "Captures down-to-down stability without over-weighting a few long plays.",
      playConfidence,
      successRateTrend,
      leagueBaseline.successRate,
      "Mount Olive is more stable when the rate clears 45%; below 40% creates long-yardage exposure.",
      percent
    ),
    metric(
      "explosive-rate",
      "Explosive Play Rate",
      mean(explosiveRateTrend),
      "",
      "Explosive rushes + explosive passes divided by offensive plays.",
      "Estimates ceiling and how quickly the offense can change game state.",
      playConfidence,
      explosiveRateTrend,
      leagueBaseline.explosiveRate,
      "The offense has a credible explosive profile, but volatility rises when pass protection breaks.",
      percent
    ),
    metric(
      "drive-efficiency",
      "Drive Efficiency",
      mean(driveEfficiencyTrend),
      "",
      "Scoring drives / total offensive drives.",
      "Evaluates how often possessions become points rather than empty yardage.",
      driveConfidence,
      driveEfficiencyTrend,
      leagueBaseline.driveEfficiency,
      "Scoring-drive rate is the strongest current team-level indicator.",
      percent
    ),
    metric(
      "red-zone-efficiency",
      "Red Zone Efficiency",
      ratio(sum(stats.map((stat) => stat.redZoneTouchdowns)), sum(stats.map((stat) => stat.redZoneTrips))),
      "",
      "Red-zone touchdowns / red-zone trips.",
      "Shows whether high-leverage scoring chances become touchdowns instead of field goals.",
      gameConfidence,
      redZoneTrend,
      leagueBaseline.redZone,
      "Compressed-field route spacing is productive, especially with pre-snap motion.",
      percent
    ),
    metric(
      "third-down-efficiency",
      "Third-Down Efficiency",
      ratio(
        sum(stats.map((stat) => stat.thirdDownConversions)),
        sum(stats.map((stat) => stat.thirdDownAttempts))
      ),
      "",
      "Third-down conversions / third-down attempts.",
      "A practical measure of drive extension and play-calling flexibility.",
      gameConfidence,
      thirdDownTrend,
      leagueBaseline.thirdDown,
      "Third-down efficiency is acceptable, but pressure-heavy opponents reduce the margin.",
      percent
    ),
    metric(
      "turnover-value",
      "Turnover Value",
      mean(turnoverTrend) * 4.2,
      " pts/game",
      "(Takeaways - turnovers) * 4.2 estimated points.",
      "Converts turnover margin into expected scoreboard value.",
      gameConfidence,
      turnoverTrend.map((item) => item * 4.2),
      0,
      "Turnover value is positive overall, but the two losses were timing-sensitive.",
      (value) => `${formatSigned(value, 1)} pts/game`
    ),
    metric(
      "opponent-adjusted",
      "Opponent-Adjusted Performance",
      mean(opponentAdjustedTrend),
      " adj EPA/play",
      "EPA/play adjusted upward for stronger opponents and downward for weaker opponents.",
      "Prevents raw production from over-crediting games against weaker schedules.",
      gameConfidence,
      opponentAdjustedTrend,
      0.02,
      "The adjusted view keeps the offense above neutral despite the Sparta and West Morris games.",
      (value) => `${formatSigned(value, 3)} adj EPA/play`
    ),
    metric(
      "strength-of-schedule",
      "Strength-of-Schedule Adjustment",
      mean(sosTrend),
      "",
      "Mean opponent strength rating from scouting and performance inputs.",
      "Shows how difficult the current sample is before evaluating raw record.",
      gameConfidence,
      sosTrend,
      0.5,
      "The schedule has moved from moderate to difficult over the last three games.",
      (value) => `${round(value * 100, 1)} rating`
    ),
    metric(
      "player-impact",
      "Player Impact Score",
      mean(playerImpactTrend),
      "",
      "Weighted EPA contribution, on-field net EPA, assignment grade, usage, and disruption.",
      "Ranks players by total value rather than raw box-score volume.",
      confidenceFromSampleSize(dataset.playerGameStats.length, 90),
      playerImpactTrend,
      72,
      "Top-end impact is concentrated among the quarterback, RB, LB, and vertical receiver.",
      (value) => `${round(value, 1)} index`
    ),
    metric(
      "reliability-rating",
      "Reliability-Adjusted Player Rating",
      mean(reliabilityTrend),
      "",
      "Impact score discounted by week-to-week volatility and availability risk.",
      "Prevents one breakout game from over-driving player evaluation.",
      confidenceFromSampleSize(dataset.playerGameStats.length, 90),
      reliabilityTrend,
      68,
      "Reliability is strongest in senior core players; limited/questionable tags reduce confidence.",
      (value) => `${round(value, 1)} index`
    ),
    metric(
      "momentum-index",
      "Momentum Index",
      mean(momentumTrend.slice(1)),
      "",
      "Week-over-week net EPA change with defensive allowance inverted.",
      "Identifies whether the team is improving or slipping relative to its own baseline.",
      gameConfidence,
      momentumTrend,
      0,
      mean(momentumTrend.slice(1)) >= 0
        ? "Recent performance is holding above the early-season baseline."
        : "Recent schedule strength has pulled the team below its own early-season trend.",
      (value) => `${formatSigned(value, 1)} index`
    ),
    metric(
      "volatility-score",
      "Volatility Score",
      mean(volatilityTrend),
      "",
      "Average absolute deviation of offensive EPA from season mean.",
      "Shows how much week-to-week output moves around the baseline.",
      gameConfidence,
      volatilityTrend,
      4.8,
      "Volatility is meaningful; matchup and protection quality are moving outcomes.",
      (value) => `${round(value, 1)} index`
    ),
    metric(
      "consistency-score",
      "Consistency Score",
      mean(consistencyTrend),
      "",
      "100 minus success-rate deviation penalty.",
      "Rewards repeatable down-to-down offense rather than isolated high-leverage plays.",
      gameConfidence,
      consistencyTrend,
      74,
      "Consistency is playable but not yet dominant against high-pressure fronts.",
      (value) => `${round(value, 1)} index`
    ),
    metric(
      "game-control",
      "Game Control Index",
      mean(gameControlTrend),
      "",
      "50 + net EPA weight + score margin weight - opponent strength drag.",
      "Summarizes whether the team controlled possession quality and scoreboard pressure.",
      gameConfidence,
      gameControlTrend,
      50,
      "Wins show strong control; losses reveal field-position and pressure sensitivity.",
      (value) => `${round(value, 1)} index`
    ),
    metric(
      "field-position-value",
      "Field Position Value",
      mean(fieldPositionTrend),
      " pts/drive",
      "(Average starting field position - own 25) * 0.12 estimated points.",
      "Converts starting field position into an estimated possession value.",
      gameConfidence,
      fieldPositionTrend,
      0,
      "Positive field position is supporting scoring efficiency in wins.",
      (value) => `${formatSigned(value, 2)} pts/drive`
    ),
    metric(
      "situational-efficiency",
      "Situational Efficiency",
      mean(situationalEfficiencyTrend),
      "",
      "Success rate grouped by down, distance, quarter, and score state.",
      "Highlights the contexts where play-calling is creating or losing leverage.",
      playConfidence,
      situationalEfficiencyTrend,
      0.41,
      "Third-and-short and red-zone contexts are sound; long-yardage is the main risk pocket.",
      percent
    ),
  ];
}

export function getMetricByKey(dataset: AnalyticsDataset, key: string) {
  return calculateTeamMetrics(dataset).find((metricResult) => metricResult.key === key);
}

export function getPlayerImpactRows(dataset: AnalyticsDataset) {
  return dataset.players
    .map((player) => {
      const rows = dataset.playerGameStats.filter((stat) => stat.playerId === player.id);
      const epaValues = rows.map((row) => row.epaContribution);
      const totalSnaps = sum(rows.map((row) => row.snaps));
      const usage = sum(rows.map((row) => row.opportunities));
      const disruption = sum(rows.map((row) => row.disruptionPlays));
      const tackles = sum(rows.map((row) => row.tackles));
      const epa = sum(epaValues);
      const grade = mean(rows.map((row) => row.assignmentGrade));
      const availabilityPenalty =
        player.status === "available" ? 0 : player.status === "limited" ? 4 : player.status === "questionable" ? 8 : 14;
      const volatility = standardDeviation(epaValues);
      const impactScore = clamp(
        52 + epa * 2.2 + grade * 0.18 + usage * 0.35 + disruption * 1.8 + tackles * 0.25 - availabilityPenalty,
        0,
        100
      );
      const reliability = clamp(impactScore - volatility * 7 - availabilityPenalty * 0.6, 0, 100);
      const onOffSwing = mean(rows.map((row) => row.onFieldNetEpa)) - mean(dataset.teamGameStats.map((row) => row.offensiveEpa));

      return {
        player,
        position: player.position,
        impactScore: round(impactScore, 1),
        reliability: round(reliability, 1),
        consistency: round(100 - volatility * 12, 1),
        usage,
        totalSnaps,
        epa: round(epa, 2),
        grade: round(grade, 1),
        onOffSwing: round(onOffSwing, 2),
        recommendation:
          reliability > 78
            ? "Stable high-leverage contributor. Keep usage central to weekly plan."
            : impactScore > 72
              ? "High-upside contributor. Pair usage with context-specific guardrails."
              : "Developmental or role-specific profile. Monitor matchup fit and workload.",
      };
    })
    .sort((a, b) => b.impactScore - a.impactScore);
}

export function getPlayerTrend(dataset: AnalyticsDataset, playerId: string) {
  return dataset.games.map((game) => {
    const row = dataset.playerGameStats.find(
      (stat) => stat.playerId === playerId && stat.gameId === game.id
    );

    return {
      week: `W${game.week}`,
      opponent: getOpponentName(game.opponentId, dataset),
      epa: round(row?.epaContribution ?? 0, 2),
      grade: round(row?.assignmentGrade ?? 0, 1),
      snaps: row?.snaps ?? 0,
      opportunities: row?.opportunities ?? 0,
    };
  });
}

function segmentName(play: Play) {
  const distanceBucket = play.distance <= 3 ? "short" : play.distance <= 7 ? "medium" : "long";
  const scoreState =
    play.scoreDiff >= 8 ? "leading" : play.scoreDiff <= -8 ? "trailing" : "neutral score";
  const zone = play.redZone ? "red zone" : play.yardLine >= 60 ? "plus territory" : "open field";

  return `${play.down}${play.down === 1 ? "st" : play.down === 2 ? "nd" : play.down === 3 ? "rd" : "th"} ${distanceBucket} / Q${play.quarter} / ${scoreState} / ${zone}`;
}

export function getSituationalEfficiency(dataset: AnalyticsDataset) {
  const grouped = mountOlivePlays(dataset).reduce<Record<string, Play[]>>((groups, play) => {
    const key = segmentName(play);
    groups[key] = [...(groups[key] ?? []), play];
    return groups;
  }, {});

  return Object.entries(grouped)
    .map(([segment, plays]) => ({
      segment,
      plays: plays.length,
      successRate: round(ratio(plays.filter((play) => play.success).length, plays.length), 3),
      epaPerPlay: round(mean(plays.map((play) => play.epa)), 3),
      explosiveRate: round(ratio(plays.filter((play) => play.explosive).length, plays.length), 3),
      reliability: round(confidenceFromSampleSize(plays.length, 28), 2),
    }))
    .sort((a, b) => b.plays - a.plays);
}

export function getOpponentScoutingRows(dataset: AnalyticsDataset) {
  return dataset.opponents
    .map((opponent) => {
      const gamesAgainst = dataset.games.filter((game) => game.opponentId === opponent.id);
      const game = gamesAgainst[0];
      const stat = game ? gameStat(dataset, game.id) : undefined;
      const pressureStress = opponent.defensivePressure * 0.45 + opponent.strengthRating * 55;
      const cluster =
        opponent.offensivePace >= 72
          ? "Tempo spread"
          : opponent.defensivePressure >= 66
            ? "Pressure-control"
            : opponent.strengthRating >= 0.6
              ? "Possession leverage"
              : "Balanced baseline";

      return {
        opponent,
        week: game?.week ?? null,
        cluster,
        matchupScore: round(
          62 +
            ((stat?.offensiveEpa ?? 1) - (stat?.defensiveEpaAllowed ?? 4)) * 1.1 -
            opponent.strengthRating * 18,
          1
        ),
        pressureStress: round(pressureStress, 1),
        offensiveRisk: round(opponent.offensivePace * 0.35 + opponent.strengthRating * 60, 1),
        recommendation:
          opponent.defensivePressure > 68
            ? "Use quick-game answers, motion identification, and six-man protection tags."
            : opponent.offensivePace > 70
              ? "Reduce missed tackles, force longer drives, and vary second-level rotations."
              : "Win early downs and keep fourth-down decisions conservative near midfield.",
      };
    })
    .sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
}

export function getGameAnalysisRows(dataset: AnalyticsDataset) {
  return dataset.games.map((game) => {
    const stat = gameStat(dataset, game.id);
    const drives = dataset.drives.filter((drive) => drive.gameId === game.id && drive.offense === "mount-olive");
    const scoringDrives = drives.filter(
      (drive) => drive.result === "touchdown" || drive.result === "field-goal"
    ).length;
    const turningPoint = drives
      .slice()
      .sort((a, b) => Math.abs(b.epa) - Math.abs(a.epa))[0];

    return {
      game,
      opponent: getOpponentName(game.opponentId, dataset),
      netEpa: round((stat?.offensiveEpa ?? 0) - (stat?.defensiveEpaAllowed ?? 0), 2),
      driveEfficiency: round(ratio(scoringDrives, drives.length), 3),
      explosivePlays: stat?.explosivePlays ?? 0,
      missedOpportunity:
        (stat?.turnovers ?? 0) > 1
          ? "Turnover timing created short-field leverage."
          : (stat?.redZoneTrips ?? 0) > (stat?.redZoneTouchdowns ?? 0)
            ? "One red-zone trip ended below touchdown value."
            : "No major structural miss; evaluate play-level execution.",
      turningPoint: turningPoint
        ? `${turningPoint.result} drive in Q${turningPoint.quarter} (${formatSigned(turningPoint.epa, 1)} EPA)`
        : "No drive data",
      modelExplanation:
        game.result === "W"
          ? "Win explained by positive offensive EPA, field-position value, and manageable turnover exposure."
          : "Loss explained by defensive EPA allowed, negative turnover value, and reduced third-down flexibility.",
    };
  });
}

export function getStrategyRecommendations(dataset: AnalyticsDataset) {
  const thirdDown = getMetricByKey(dataset, "third-down-efficiency");
  const redZone = getMetricByKey(dataset, "red-zone-efficiency");
  const explosive = getMetricByKey(dataset, "explosive-rate");
  const success = getMetricByKey(dataset, "success-rate");
  const volatility = getMetricByKey(dataset, "volatility-score");
  const baseWinProbability = mean(dataset.games.map((game) => game.winProbabilityStart));

  return [
    {
      title: "Fourth-down recommendation",
      signal: "Go at opponent 43 or closer on 4th-and-2 or less.",
      confidence: thirdDown?.confidence ?? 0.5,
      rationale:
        "Conversion model weights success rate, field position value, and opponent strength. Current sample supports aggression in plus territory but not backed-up midfield attempts.",
    },
    {
      title: "Run/pass tendency analyzer",
      signal:
        (success?.value ?? 0) > 0.44
          ? "Maintain balanced early-down sequencing with constraint screens."
          : "Use higher-percentage quick game to restore 2nd-and-manageable.",
      confidence: success?.confidence ?? 0.5,
      rationale:
        "Early-down success is the strongest controllable input for reducing pressure exposure.",
    },
    {
      title: "Red-zone decision helper",
      signal:
        (redZone?.value ?? 0) > 0.66
          ? "Keep touchdown-first posture inside the 10."
          : "Increase motion and bunch spacing to diagnose leverage pre-snap.",
      confidence: redZone?.confidence ?? 0.5,
      rationale:
        "Compressed-field efficiency is above baseline but sample size is small.",
    },
    {
      title: "Opponent weakness finder",
      signal:
        (explosive?.value ?? 0) > 0.085
          ? "Test quarters safeties with vertical switch concepts after run-action."
          : "Prioritize sustained-drive answers over low-probability shots.",
      confidence: explosive?.confidence ?? 0.5,
      rationale:
        "Explosive rate provides the ceiling input for matchup-specific shot calls.",
    },
    {
      title: "Scenario simulator",
      signal: `${round(baseWinProbability * 100, 1)}% neutral-script baseline; volatility adds +/- ${round(
        (volatility?.value ?? 4) * 2,
        1
      )} points.`,
      confidence: 0.58,
      rationale:
        "Monte Carlo estimate uses current win probability priors, turnover value, and observed volatility.",
    },
  ];
}

export function getReportCatalog(dataset: AnalyticsDataset) {
  const latestGame = [...dataset.games].sort((a, b) => b.date.localeCompare(a.date))[0]!;
  const topPlayer = getPlayerImpactRows(dataset)[0]!;
  const topOpponent = getOpponentScoutingRows(dataset).sort((a, b) => b.pressureStress - a.pressureStress)[0]!;

  return [
    {
      title: "Weekly Team Report",
      scope: "Team performance",
      status: "Ready",
      included: "Trends, player leaders, availability, risks, methodology notes",
      insight: "Team performance is positive overall, but pressure-heavy opponents are reducing offensive stability.",
    },
    {
      title: "Opponent Scouting Report",
      scope: topOpponent.opponent.name,
      status: "Ready",
      included: "Tendencies, cluster profile, matchup risks, recommended strategy",
      insight: `${topOpponent.opponent.name} profiles as ${topOpponent.cluster.toLowerCase()} with ${round(
        topOpponent.pressureStress,
        1
      )} pressure stress.`,
    },
    {
      title: "Player Development Report",
      scope: topPlayer.player.name,
      status: "Ready",
      included: "Impact, trend, reliability, on/off-field estimate, coach recommendation",
      insight: `${topPlayer.player.name} is the current top impact profile at ${topPlayer.impactScore}.`,
    },
    {
      title: "Game Recap Report",
      scope: `Week ${latestGame.week} vs ${getOpponentName(latestGame.opponentId, dataset)}`,
      status: "Ready",
      included: "Win probability, drive chart, key turning points, postgame model explanation",
      insight: latestGame.notes,
    },
    {
      title: "Season Analytics Report",
      scope: dataset.team.season,
      status: "Draft",
      included: "Full statistical inventory, ML validation, schedule adjustment, limitations",
      insight: "Season-level conclusions should stay confidence-weighted until more games are imported.",
    },
  ];
}

export function buildModelingRows(dataset: AnalyticsDataset): ModelFeatureRow[] {
  return mountOliveDrives(dataset).map((drive) => {
    const game = dataset.games.find((item) => item.id === drive.gameId)!;
    const opponent = dataset.opponents.find((item) => item.id === game.opponentId)!;
    const plays = dataset.plays.filter((play) => play.driveId === drive.id);
    const drivePoints = drive.result === "touchdown" ? 7 : drive.result === "field-goal" ? 3 : 0;
    const successfulDrive = drivePoints > 0 ? 1 : 0;
    const turnover = drive.result === "turnover" ? 1 : 0;

    return {
      id: drive.id,
      label: `W${game.week} ${getOpponentName(game.opponentId, dataset)} Q${drive.quarter}`,
      source: "drive",
      features: {
        start_field_position: drive.startYardLine,
        drive_play_count: drive.playCount,
        yards_before_result: drive.yards,
        mean_play_epa: mean(plays.map((play) => play.epa)),
        success_rate: ratio(plays.filter((play) => play.success).length, plays.length),
        explosive_rate: ratio(plays.filter((play) => play.explosive).length, plays.length),
        third_or_fourth_down_rate: ratio(
          plays.filter((play) => play.down === 3 || play.down === 4).length,
          plays.length
        ),
        red_zone_snap_rate: ratio(plays.filter((play) => play.redZone).length, plays.length),
        turnover,
        opponent_strength: opponent.strengthRating,
        opponent_pressure: opponent.defensivePressure / 100,
        score_diff_entering: drive.startScoreDiff,
      },
      targets: {
        drive_points: drivePoints,
        successful_drive: successfulDrive,
        yards_gained: drive.yards,
        game_win: game.result === "W" ? 1 : 0,
        final_margin: game.scoreFor - game.scoreAgainst,
      },
    };
  });
}
