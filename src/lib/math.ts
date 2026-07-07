export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
}

export function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1]! + sorted[midpoint]!) / 2;
  }

  return sorted[midpoint]!;
}

export function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));

  return Math.sqrt(variance);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function percent(value: number, digits = 1) {
  return `${round(value * 100, digits)}%`;
}

export function ratio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

export function zScore(value: number, values: number[]) {
  const deviation = standardDeviation(values);

  if (deviation === 0) {
    return 0;
  }

  return (value - mean(values)) / deviation;
}

export function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function minMaxScale(value: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return 0.5;
  }

  return (value - min) / (max - min);
}

export function confidenceFromSampleSize(sampleSize: number, idealSampleSize: number) {
  return clamp(Math.sqrt(sampleSize / idealSampleSize), 0.18, 0.98);
}

export function formatSigned(value: number, digits = 1) {
  const rounded = round(value, digits);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function transpose(matrix: number[][]) {
  if (matrix.length === 0) {
    return [];
  }

  return matrix[0]!.map((_, columnIndex) => matrix.map((row) => row[columnIndex] ?? 0));
}

export function multiplyMatrices(left: number[][], right: number[][]) {
  const rightTranspose = transpose(right);

  return left.map((row) =>
    rightTranspose.map((column) =>
      row.reduce((total, value, index) => total + value * (column[index] ?? 0), 0)
    )
  );
}

export function multiplyMatrixVector(matrix: number[][], vector: number[]) {
  return matrix.map((row) =>
    row.reduce((total, value, index) => total + value * (vector[index] ?? 0), 0)
  );
}

export function invertMatrix(matrix: number[][]) {
  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, columnIndex) => (columnIndex === rowIndex ? 1 : 0)),
  ]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;

    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row]![column]!) > Math.abs(augmented[pivotRow]![column]!)) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow]![column]!) < 1e-9) {
      throw new Error("Matrix is singular and cannot be inverted.");
    }

    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow]!, augmented[column]!];

    const pivot = augmented[column]![column]!;

    for (let index = 0; index < size * 2; index += 1) {
      augmented[column]![index] = augmented[column]![index]! / pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row]![column]!;

      for (let index = 0; index < size * 2; index += 1) {
        augmented[row]![index] = augmented[row]![index]! - factor * augmented[column]![index]!;
      }
    }
  }

  return augmented.map((row) => row.slice(size));
}
