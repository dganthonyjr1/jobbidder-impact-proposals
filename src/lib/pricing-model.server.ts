import { normalizeTradeKey } from "@/lib/trade-playbooks";
import { computeTotals, type MaterialLine, type LaborLine } from "@/lib/pricing";

/**
 * Pooled, cross-contractor win-probability model.
 *
 * Trained on every decided (accepted/declined) proposal on the platform —
 * anonymized down to a handful of numeric features, never per-contractor or
 * per-client data. A single contractor's own history is almost always too
 * small to train anything trustworthy; pooling gives every contractor the
 * benefit of the whole platform's outcomes from day one, and the model
 * genuinely improves as more proposals get decided.
 *
 * selected_tier is deliberately NOT a feature — it's only defined for
 * accepted proposals, so using it would leak the label.
 */

// One-hot trade dummies, "general" held out as the baseline category.
const TRADE_KEYS = [
  "solar", "roofing", "plumbing", "hvac", "flooring",
  "landscaping", "electrical", "painting", "glazing", "remodeling",
] as const;

export const FEATURE_NAMES = ["overhead_percentage", "log_price", ...TRADE_KEYS];

export type ProposalFeatureInput = {
  trade_type?: string | null;
  overhead_percentage?: number | null;
  materials?: MaterialLine[] | null;
  labor?: LaborLine[] | null;
  tax_rate?: number | null;
};

export function extractFeatures(input: ProposalFeatureInput): number[] {
  const tradeKey = normalizeTradeKey(input.trade_type);
  const totals = computeTotals(
    (input.materials || []) as MaterialLine[],
    (input.labor || []) as LaborLine[],
    "better",
    Number(input.tax_rate) || 0.07,
    Number(input.overhead_percentage) || 0,
  );
  const logPrice = totals.grandTotal > 0 ? Math.log(totals.grandTotal) : 0;
  const tradeDummies = TRADE_KEYS.map((k) => (k === tradeKey ? 1 : 0));
  return [Number(input.overhead_percentage) || 0, logPrice, ...tradeDummies];
}

export type TrainedModel = {
  featureNames: string[];
  featureMeans: number[];
  featureStds: number[];
  weights: number[];
  intercept: number;
  sampleSize: number;
};

/** Logistic regression via batch gradient descent with L2 regularization. */
export function trainLogisticRegression(
  rows: { features: number[]; label: 0 | 1 }[],
  opts: { iterations?: number; learningRate?: number; l2?: number } = {},
): TrainedModel {
  const { iterations = 500, learningRate = 0.3, l2 = 0.5 } = opts;
  const n = rows.length;
  const d = FEATURE_NAMES.length;

  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(1);
  for (let j = 0; j < d; j++) {
    const col = rows.map((r) => r.features[j]);
    const mean = col.reduce((a, b) => a + b, 0) / n;
    const variance = col.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance) || 1;
    means[j] = mean;
    stds[j] = std;
  }

  const X = rows.map((r) => r.features.map((v, j) => (v - means[j]) / stds[j]));
  const y = rows.map((r) => r.label);

  let intercept = 0;
  let weights = new Array(d).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      const z = intercept + X[i].reduce((sum, xij, j) => sum + xij * weights[j], 0);
      const pred = 1 / (1 + Math.exp(-z));
      const error = pred - y[i];
      for (let j = 0; j < d; j++) gradW[j] += error * X[i][j];
      gradB += error;
    }
    for (let j = 0; j < d; j++) {
      weights[j] -= learningRate * (gradW[j] / n + l2 * weights[j] / n);
    }
    intercept -= learningRate * (gradB / n);
  }

  return { featureNames: [...FEATURE_NAMES], featureMeans: means, featureStds: stds, weights, intercept, sampleSize: n };
}

export function predictWinProbability(features: number[], model: TrainedModel): number {
  const z = model.intercept + features.reduce((sum, v, j) => {
    const standardized = (v - model.featureMeans[j]) / (model.featureStds[j] || 1);
    return sum + standardized * model.weights[j];
  }, 0);
  return 1 / (1 + Math.exp(-z));
}
