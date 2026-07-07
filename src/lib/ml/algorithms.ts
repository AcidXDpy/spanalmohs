import type { ModelFeatureRow } from "@/types";
import {
  clamp,
  invertMatrix,
  mean,
  multiplyMatrices,
  multiplyMatrixVector,
  round,
  sigmoid,
  standardDeviation,
  sum,
  transpose,
} from "@/lib/math";

export type MlModelKind =
  | "linear-regression"
  | "logistic-regression"
  | "decision-tree"
  | "random-forest"
  | "k-means";

export interface ModelRunConfig {
  kind: MlModelKind;
  target: string;
  features: string[];
  trainRatio: number;
}

export interface PredictionRow {
  label: string;
  actual: number;
  predicted: number;
  split: "train" | "test" | "cluster";
}

export interface ModelMetric {
  label: string;
  value: string;
}

export interface FeatureWeight {
  feature: string;
  value: number;
  interpretation: string;
}

export interface ClusterSummary {
  id: number;
  size: number;
  description: string;
  centroid: Record<string, number>;
}

export interface ModelReport {
  title: string;
  modelKind: MlModelKind;
  warning: string | null;
  metrics: ModelMetric[];
  explanation: string;
  featureWeights: FeatureWeight[];
  predictions: PredictionRow[];
  rules: string[];
  clusters: ClusterSummary[];
}

interface PreparedRow {
  source: ModelFeatureRow;
  x: number[];
  y: number;
}

interface Standardizer {
  means: number[];
  deviations: number[];
}

interface TreeNode {
  prediction: number;
  samples: number;
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export const modelOptions: Array<{ value: MlModelKind; label: string; description: string }> = [
  {
    value: "linear-regression",
    label: "Multiple Linear Regression",
    description: "Predicts continuous outcomes and exposes signed coefficients.",
  },
  {
    value: "logistic-regression",
    label: "Logistic Regression",
    description: "Predicts conversion or win probability with gradient descent.",
  },
  {
    value: "decision-tree",
    label: "Decision Tree",
    description: "Creates readable threshold rules for situations or profiles.",
  },
  {
    value: "random-forest",
    label: "Random Forest",
    description: "Averages many shallow trees and reports feature importance.",
  },
  {
    value: "k-means",
    label: "K-Means Clustering",
    description: "Groups drives, opponents, or profiles by similar feature shape.",
  },
];

export const targetOptions = [
  { value: "drive_points", label: "Drive Points", type: "continuous" },
  { value: "yards_gained", label: "Drive Yards", type: "continuous" },
  { value: "successful_drive", label: "Scoring Drive", type: "binary" },
  { value: "game_win", label: "Game Win", type: "binary" },
  { value: "final_margin", label: "Final Margin", type: "continuous" },
] as const;

export const defaultFeatureSet = [
  "start_field_position",
  "drive_play_count",
  "yards_before_result",
  "mean_play_epa",
  "success_rate",
  "explosive_rate",
  "third_or_fourth_down_rate",
  "red_zone_snap_rate",
  "turnover",
  "opponent_strength",
  "opponent_pressure",
  "score_diff_entering",
];

function prepareRows(rows: ModelFeatureRow[], target: string, features: string[]): PreparedRow[] {
  return rows
    .map((row) => ({
      source: row,
      x: features.map((feature) => row.features[feature] ?? Number.NaN),
      y: row.targets[target] ?? Number.NaN,
    }))
    .filter((row) => row.x.every(Number.isFinite) && Number.isFinite(row.y));
}

function splitRows(rows: PreparedRow[], trainRatio: number) {
  const trainSize = clamp(Math.floor(rows.length * trainRatio), Math.min(4, rows.length), rows.length - 1);
  return {
    train: rows.slice(0, trainSize),
    test: rows.slice(trainSize),
  };
}

function fitStandardizer(rows: PreparedRow[]): Standardizer {
  const width = rows[0]?.x.length ?? 0;

  return {
    means: Array.from({ length: width }, (_, index) => mean(rows.map((row) => row.x[index] ?? 0))),
    deviations: Array.from({ length: width }, (_, index) => {
      const deviation = standardDeviation(rows.map((row) => row.x[index] ?? 0));
      return deviation === 0 ? 1 : deviation;
    }),
  };
}

function transformX(x: number[], standardizer: Standardizer) {
  return x.map((value, index) => (value - (standardizer.means[index] ?? 0)) / (standardizer.deviations[index] ?? 1));
}

function withIntercept(rows: PreparedRow[], standardizer: Standardizer) {
  return rows.map((row) => [1, ...transformX(row.x, standardizer)]);
}

function rmse(actual: number[], predicted: number[]) {
  return Math.sqrt(mean(actual.map((value, index) => (value - (predicted[index] ?? 0)) ** 2)));
}

function mae(actual: number[], predicted: number[]) {
  return mean(actual.map((value, index) => Math.abs(value - (predicted[index] ?? 0))));
}

function rSquared(actual: number[], predicted: number[]) {
  const actualMean = mean(actual);
  const total = sum(actual.map((value) => (value - actualMean) ** 2));
  const residual = sum(actual.map((value, index) => (value - (predicted[index] ?? 0)) ** 2));

  if (total === 0) {
    return 0;
  }

  return 1 - residual / total;
}

function classificationMetrics(actual: number[], probabilities: number[]) {
  const classes = probabilities.map((probability) => (probability >= 0.5 ? 1 : 0));
  const accuracy = mean(actual.map((value, index) => (value === classes[index] ? 1 : 0)));
  const logLoss = -mean(
    actual.map((value, index) => {
      const probability = clamp(probabilities[index] ?? 0.5, 1e-6, 1 - 1e-6);
      return value * Math.log(probability) + (1 - value) * Math.log(1 - probability);
    })
  );

  return { accuracy, logLoss };
}

function sampleWarning(rows: PreparedRow[], features: string[]) {
  if (rows.length < 30) {
    return `Exploratory model: ${rows.length} rows are available. Use coefficients and feature rankings as directional evidence, not proof.`;
  }

  if (rows.length < features.length * 8) {
    return `Moderate sample warning: ${rows.length} rows for ${features.length} features may overfit. Validate against future games.`;
  }

  return null;
}

function runLinearRegression(rows: PreparedRow[], config: ModelRunConfig): ModelReport {
  const split = splitRows(rows, config.trainRatio);
  const standardizer = fitStandardizer(split.train);
  const xTrain = withIntercept(split.train, standardizer);
  const yTrain = split.train.map((row) => row.y);
  const xt = transpose(xTrain);
  const xtx = multiplyMatrices(xt, xTrain);

  for (let index = 1; index < xtx.length; index += 1) {
    xtx[index]![index] = (xtx[index]![index] ?? 0) + 0.08;
  }

  const xty = multiplyMatrixVector(xt, yTrain);
  const coefficients = multiplyMatrixVector(invertMatrix(xtx), xty);
  const predict = (row: PreparedRow) =>
    [1, ...transformX(row.x, standardizer)].reduce(
      (total, value, index) => total + value * (coefficients[index] ?? 0),
      0
    );
  const testPredictions = split.test.map(predict);
  const actual = split.test.map((row) => row.y);

  return {
    title: "Multiple Linear Regression",
    modelKind: config.kind,
    warning: sampleWarning(rows, config.features),
    metrics: [
      { label: "R Squared", value: round(rSquared(actual, testPredictions), 3).toString() },
      { label: "RMSE", value: round(rmse(actual, testPredictions), 2).toString() },
      { label: "MAE", value: round(mae(actual, testPredictions), 2).toString() },
      { label: "Train/Test", value: `${split.train.length}/${split.test.length}` },
    ],
    explanation:
      "Linear regression fits a weighted equation against standardized features. Positive coefficients increase the target after controlling for the other selected inputs.",
    featureWeights: config.features.map((feature, index) => {
      const value = coefficients[index + 1] ?? 0;

      return {
        feature,
        value: round(value, 3),
        interpretation:
          value >= 0
            ? "Higher values push the prediction upward in this sample."
            : "Higher values push the prediction downward in this sample.",
      };
    }),
    predictions: [
      ...split.train.map((row) => ({
        label: row.source.label,
        actual: row.y,
        predicted: round(predict(row), 2),
        split: "train" as const,
      })),
      ...split.test.map((row, index) => ({
        label: row.source.label,
        actual: row.y,
        predicted: round(testPredictions[index] ?? 0, 2),
        split: "test" as const,
      })),
    ],
    rules: [`Prediction = ${round(coefficients[0] ?? 0, 2)} + selected standardized feature weights.`],
    clusters: [],
  };
}

function runLogisticRegression(rows: PreparedRow[], config: ModelRunConfig): ModelReport {
  const binaryRows = rows.map((row) => ({ ...row, y: row.y >= 0.5 ? 1 : 0 }));
  const split = splitRows(binaryRows, config.trainRatio);
  const standardizer = fitStandardizer(split.train);
  const width = config.features.length + 1;
  const weights = Array.from({ length: width }, () => 0);
  const learningRate = 0.08;

  for (let iteration = 0; iteration < 900; iteration += 1) {
    const gradients = Array.from({ length: width }, () => 0);

    split.train.forEach((row) => {
      const vector = [1, ...transformX(row.x, standardizer)];
      const prediction = sigmoid(sum(vector.map((value, index) => value * (weights[index] ?? 0))));
      const error = prediction - row.y;

      vector.forEach((value, index) => {
        gradients[index] = (gradients[index] ?? 0) + error * value;
      });
    });

    weights.forEach((_, index) => {
      weights[index] = (weights[index] ?? 0) - (learningRate * (gradients[index] ?? 0)) / split.train.length;
    });
  }

  const predict = (row: PreparedRow) =>
    sigmoid(
      sum(
        [1, ...transformX(row.x, standardizer)].map(
          (value, index) => value * (weights[index] ?? 0)
        )
      )
    );
  const testProbabilities = split.test.map(predict);
  const actual = split.test.map((row) => row.y);
  const metrics = classificationMetrics(actual, testProbabilities);

  return {
    title: "Logistic Regression",
    modelKind: config.kind,
    warning: sampleWarning(rows, config.features),
    metrics: [
      { label: "Accuracy", value: `${round(metrics.accuracy * 100, 1)}%` },
      { label: "Log Loss", value: round(metrics.logLoss, 3).toString() },
      { label: "Train/Test", value: `${split.train.length}/${split.test.length}` },
    ],
    explanation:
      "Logistic regression estimates the probability of a binary target. Coefficients represent directional pressure on log-odds, not guaranteed causation.",
    featureWeights: config.features.map((feature, index) => {
      const value = weights[index + 1] ?? 0;

      return {
        feature,
        value: round(value, 3),
        interpretation:
          value >= 0
            ? "Raises estimated probability when the feature increases."
            : "Lowers estimated probability when the feature increases.",
      };
    }),
    predictions: [
      ...split.train.map((row) => ({
        label: row.source.label,
        actual: row.y,
        predicted: round(predict(row), 3),
        split: "train" as const,
      })),
      ...split.test.map((row, index) => ({
        label: row.source.label,
        actual: row.y,
        predicted: round(testProbabilities[index] ?? 0, 3),
        split: "test" as const,
      })),
    ],
    rules: ["Probability = sigmoid(intercept + selected standardized feature weights)."],
    clusters: [],
  };
}

function nodePrediction(rows: PreparedRow[], mode: "classification" | "regression") {
  if (mode === "classification") {
    return mean(rows.map((row) => row.y)) >= 0.5 ? 1 : 0;
  }

  return mean(rows.map((row) => row.y));
}

function splitLoss(rows: PreparedRow[], mode: "classification" | "regression") {
  if (rows.length === 0) {
    return 0;
  }

  if (mode === "classification") {
    const p = mean(rows.map((row) => row.y));
    return 1 - p ** 2 - (1 - p) ** 2;
  }

  const prediction = mean(rows.map((row) => row.y));
  return mean(rows.map((row) => (row.y - prediction) ** 2));
}

function bestTreeSplit(
  rows: PreparedRow[],
  featureIndexes: number[],
  mode: "classification" | "regression"
): { feature: number; threshold: number; loss: number } | null {
  let best: { feature: number; threshold: number; loss: number } | null = null;

  featureIndexes.forEach((feature) => {
    const values = [...new Set(rows.map((row) => row.x[feature] ?? 0))].sort((a, b) => a - b);
    const thresholds = values.slice(1).map((value, index) => ((values[index] ?? value) + value) / 2);

    thresholds.forEach((threshold) => {
      const left = rows.filter((row) => (row.x[feature] ?? 0) <= threshold);
      const right = rows.filter((row) => (row.x[feature] ?? 0) > threshold);

      if (left.length < 2 || right.length < 2) {
        return;
      }

      const loss = (left.length / rows.length) * splitLoss(left, mode) + (right.length / rows.length) * splitLoss(right, mode);

      if (!best || loss < best.loss) {
        best = { feature, threshold, loss };
      }
    });
  });

  return best;
}

function buildTree(
  rows: PreparedRow[],
  featureIndexes: number[],
  mode: "classification" | "regression",
  depth = 0,
  maxDepth = 3
): TreeNode {
  const node: TreeNode = {
    prediction: nodePrediction(rows, mode),
    samples: rows.length,
  };

  if (depth >= maxDepth || rows.length < 5 || splitLoss(rows, mode) < 0.001) {
    return node;
  }

  const split = bestTreeSplit(rows, featureIndexes, mode);

  if (!split) {
    return node;
  }

  const chosenSplit: { feature: number; threshold: number; loss: number } = split;
  const left = rows.filter((row) => (row.x[chosenSplit.feature] ?? 0) <= chosenSplit.threshold);
  const right = rows.filter((row) => (row.x[chosenSplit.feature] ?? 0) > chosenSplit.threshold);

  return {
    ...node,
    feature: chosenSplit.feature,
    threshold: chosenSplit.threshold,
    left: buildTree(left, featureIndexes, mode, depth + 1, maxDepth),
    right: buildTree(right, featureIndexes, mode, depth + 1, maxDepth),
  };
}

function predictTree(node: TreeNode, row: PreparedRow): number {
  if (node.feature === undefined || node.threshold === undefined || !node.left || !node.right) {
    return node.prediction;
  }

  return (row.x[node.feature] ?? 0) <= node.threshold
    ? predictTree(node.left, row)
    : predictTree(node.right, row);
}

function treeRules(node: TreeNode, features: string[], path: string[] = []): string[] {
  if (node.feature === undefined || node.threshold === undefined || !node.left || !node.right) {
    return [`${path.length ? path.join(" and ") : "All rows"} => prediction ${round(node.prediction, 2)} (${node.samples} samples)`];
  }

  return [
    ...treeRules(node.left, features, [
      ...path,
      `${features[node.feature]} <= ${round(node.threshold, 2)}`,
    ]),
    ...treeRules(node.right, features, [
      ...path,
      `${features[node.feature]} > ${round(node.threshold, 2)}`,
    ]),
  ];
}

function collectTreeImportance(node: TreeNode, counts: Record<number, number>) {
  if (node.feature === undefined || !node.left || !node.right) {
    return;
  }

  counts[node.feature] = (counts[node.feature] ?? 0) + node.samples;
  collectTreeImportance(node.left, counts);
  collectTreeImportance(node.right, counts);
}

function runDecisionTree(rows: PreparedRow[], config: ModelRunConfig): ModelReport {
  const targetType = targetOptions.find((option) => option.value === config.target)?.type;
  const mode = targetType === "binary" ? "classification" : "regression";
  const split = splitRows(rows, config.trainRatio);
  const tree = buildTree(
    mode === "classification" ? split.train.map((row) => ({ ...row, y: row.y >= 0.5 ? 1 : 0 })) : split.train,
    config.features.map((_, index) => index),
    mode,
    0,
    3
  );
  const testRows = mode === "classification" ? split.test.map((row) => ({ ...row, y: row.y >= 0.5 ? 1 : 0 })) : split.test;
  const predictions = testRows.map((row) => predictTree(tree, row));
  const actual = testRows.map((row) => row.y);
  const classMetrics = mode === "classification" ? classificationMetrics(actual, predictions) : null;
  const importance: Record<number, number> = {};
  collectTreeImportance(tree, importance);
  const importanceTotal = Math.max(sum(Object.values(importance)), 1);

  return {
    title: "Decision Tree",
    modelKind: config.kind,
    warning: sampleWarning(rows, config.features),
    metrics:
      mode === "classification"
        ? [
            { label: "Accuracy", value: `${round((classMetrics?.accuracy ?? 0) * 100, 1)}%` },
            { label: "Log Loss", value: round(classMetrics?.logLoss ?? 0, 3).toString() },
            { label: "Train/Test", value: `${split.train.length}/${split.test.length}` },
          ]
        : [
            { label: "R Squared", value: round(rSquared(actual, predictions), 3).toString() },
            { label: "RMSE", value: round(rmse(actual, predictions), 2).toString() },
            { label: "MAE", value: round(mae(actual, predictions), 2).toString() },
          ],
    explanation:
      "The tree greedily chooses thresholds that reduce impurity. It is useful for coach-readable rules, but small samples can overfit sharply.",
    featureWeights: config.features.map((feature, index) => ({
      feature,
      value: round((importance[index] ?? 0) / importanceTotal, 3),
      interpretation: "Share of tree split responsibility in this fitted tree.",
    })),
    predictions: [
      ...split.train.map((row) => ({
        label: row.source.label,
        actual: mode === "classification" ? (row.y >= 0.5 ? 1 : 0) : row.y,
        predicted: round(predictTree(tree, mode === "classification" ? { ...row, y: row.y >= 0.5 ? 1 : 0 } : row), 2),
        split: "train" as const,
      })),
      ...testRows.map((row, index) => ({
        label: row.source.label,
        actual: row.y,
        predicted: round(predictions[index] ?? 0, 2),
        split: "test" as const,
      })),
    ],
    rules: treeRules(tree, config.features).slice(0, 8),
    clusters: [],
  };
}

function deterministicBootstrap(rows: PreparedRow[], seed: number) {
  return rows.map((_, index) => rows[(index * 7 + seed * 5) % rows.length]!);
}

function featureSubset(features: string[], seed: number) {
  const size = Math.max(2, Math.ceil(Math.sqrt(features.length)));
  const indexes = Array.from({ length: features.length }, (_, index) => index)
    .sort((a, b) => ((a + seed * 3) % features.length) - ((b + seed * 3) % features.length))
    .slice(0, size);

  return indexes;
}

function runRandomForest(rows: PreparedRow[], config: ModelRunConfig): ModelReport {
  const targetType = targetOptions.find((option) => option.value === config.target)?.type;
  const mode = targetType === "binary" ? "classification" : "regression";
  const split = splitRows(rows, config.trainRatio);
  const trees = Array.from({ length: 21 }, (_, seed) => {
    const indexes = featureSubset(config.features, seed);
    const bootstrapped = deterministicBootstrap(split.train, seed);
    return {
      indexes,
      tree: buildTree(
        mode === "classification" ? bootstrapped.map((row) => ({ ...row, y: row.y >= 0.5 ? 1 : 0 })) : bootstrapped,
        indexes,
        mode,
        0,
        3
      ),
    };
  });
  const predict = (row: PreparedRow) => {
    const predictions = trees.map(({ tree }) =>
      predictTree(tree, mode === "classification" ? { ...row, y: row.y >= 0.5 ? 1 : 0 } : row)
    );
    const prediction = mean(predictions);
    return mode === "classification" ? clamp(prediction, 0, 1) : prediction;
  };
  const testRows = mode === "classification" ? split.test.map((row) => ({ ...row, y: row.y >= 0.5 ? 1 : 0 })) : split.test;
  const predictions = testRows.map(predict);
  const actual = testRows.map((row) => row.y);
  const classMetrics = mode === "classification" ? classificationMetrics(actual, predictions) : null;
  const importance: Record<number, number> = {};
  trees.forEach(({ tree }) => collectTreeImportance(tree, importance));
  const importanceTotal = Math.max(sum(Object.values(importance)), 1);

  return {
    title: "Random Forest",
    modelKind: config.kind,
    warning: sampleWarning(rows, config.features),
    metrics:
      mode === "classification"
        ? [
            { label: "Accuracy", value: `${round((classMetrics?.accuracy ?? 0) * 100, 1)}%` },
            { label: "Log Loss", value: round(classMetrics?.logLoss ?? 0, 3).toString() },
            { label: "Trees", value: trees.length.toString() },
          ]
        : [
            { label: "R Squared", value: round(rSquared(actual, predictions), 3).toString() },
            { label: "RMSE", value: round(rmse(actual, predictions), 2).toString() },
            { label: "MAE", value: round(mae(actual, predictions), 2).toString() },
          ],
    explanation:
      "Random forest trains multiple shallow trees on deterministic bootstraps and feature subsets, then averages their predictions to reduce single-tree variance.",
    featureWeights: config.features.map((feature, index) => ({
      feature,
      value: round((importance[index] ?? 0) / importanceTotal, 3),
      interpretation: "Relative split frequency and sample coverage across the forest.",
    })),
    predictions: [
      ...split.train.map((row) => ({
        label: row.source.label,
        actual: mode === "classification" ? (row.y >= 0.5 ? 1 : 0) : row.y,
        predicted: round(predict(row), 2),
        split: "train" as const,
      })),
      ...testRows.map((row, index) => ({
        label: row.source.label,
        actual: row.y,
        predicted: round(predictions[index] ?? 0, 2),
        split: "test" as const,
      })),
    ],
    rules: [
      "Forest prediction is the average of 21 shallow trees.",
      "Feature importance is based on split frequency weighted by node sample count.",
    ],
    clusters: [],
  };
}

function distance(left: number[], right: number[]) {
  return Math.sqrt(sum(left.map((value, index) => (value - (right[index] ?? 0)) ** 2)));
}

function runKMeans(rows: PreparedRow[], config: ModelRunConfig): ModelReport {
  const k = Math.min(3, Math.max(2, Math.floor(Math.sqrt(rows.length / 2))));
  const standardizer = fitStandardizer(rows);
  const vectors = rows.map((row) => transformX(row.x, standardizer));
  let centroids = [vectors[0]!, vectors[Math.floor(vectors.length / 2)]!, vectors[vectors.length - 1]!].slice(0, k);
  let assignments = vectors.map((_, index) => index % k);

  for (let iteration = 0; iteration < 24; iteration += 1) {
    assignments = vectors.map((vector) => {
      const distances = centroids.map((centroid) => distance(vector, centroid));
      return distances.indexOf(Math.min(...distances));
    });
    centroids = centroids.map((centroid, clusterIndex) => {
      const members = vectors.filter((_, index) => assignments[index] === clusterIndex);

      if (members.length === 0) {
        return centroid;
      }

      return centroid.map((_, featureIndex) => mean(members.map((member) => member[featureIndex] ?? 0)));
    });
  }

  const inertia = sum(vectors.map((vector, index) => distance(vector, centroids[assignments[index] ?? 0]!) ** 2));
  const clusters = centroids.map((centroid, clusterIndex) => {
    const members = rows.filter((_, index) => assignments[index] === clusterIndex);
    const rawCentroid = Object.fromEntries(
      config.features.map((feature, index) => [
        feature,
        round((centroid[index] ?? 0) * (standardizer.deviations[index] ?? 1) + (standardizer.means[index] ?? 0), 3),
      ])
    );
    const strongestFeatureIndex = centroid
      .map((value, index) => ({ index, value: Math.abs(value) }))
      .sort((a, b) => b.value - a.value)[0]?.index ?? 0;

    return {
      id: clusterIndex + 1,
      size: members.length,
      centroid: rawCentroid,
      description: `Cluster ${clusterIndex + 1}: elevated ${config.features[strongestFeatureIndex]?.replaceAll("_", " ")} profile.`,
    };
  });

  return {
    title: "K-Means Clustering",
    modelKind: config.kind,
    warning: sampleWarning(rows, config.features),
    metrics: [
      { label: "Clusters", value: k.toString() },
      { label: "Inertia", value: round(inertia, 2).toString() },
      { label: "Rows Clustered", value: rows.length.toString() },
    ],
    explanation:
      "K-means standardizes selected features, initializes deterministic centroids, and iteratively assigns rows to the nearest centroid.",
    featureWeights: config.features.map((feature, index) => ({
      feature,
      value: round(standardDeviation(centroids.map((centroid) => centroid[index] ?? 0)), 3),
      interpretation: "Centroid separation for this feature across clusters.",
    })),
    predictions: rows.map((row, index) => ({
      label: row.source.label,
      actual: row.y,
      predicted: (assignments[index] ?? 0) + 1,
      split: "cluster" as const,
    })),
    rules: clusters.map((cluster) => cluster.description),
    clusters,
  };
}

export function runModel(rows: ModelFeatureRow[], config: ModelRunConfig): ModelReport {
  const prepared = prepareRows(rows, config.target, config.features);

  if (prepared.length < 5 || config.features.length === 0) {
    return {
      title: "Insufficient data",
      modelKind: config.kind,
      warning: "Select at least one feature and provide at least five valid rows before training.",
      metrics: [],
      explanation: "The modeling pipeline did not run because the selected data is too small.",
      featureWeights: [],
      predictions: [],
      rules: [],
      clusters: [],
    };
  }

  if (config.kind === "linear-regression") {
    return runLinearRegression(prepared, config);
  }

  if (config.kind === "logistic-regression") {
    return runLogisticRegression(prepared, config);
  }

  if (config.kind === "decision-tree") {
    return runDecisionTree(prepared, config);
  }

  if (config.kind === "random-forest") {
    return runRandomForest(prepared, config);
  }

  return runKMeans(prepared, config);
}
