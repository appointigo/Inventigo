export const FORECAST_POLICY = {
  historyWindowDays: 365,
  readyHistoryDays: 60,
  readyActiveDays: 20,
  readyTransactions: 12,
  readyUnits: 20,
  limitedHistoryDays: 28,
  limitedActiveDays: 7,
  limitedTransactions: 5,
  limitedUnits: 8,
  minimumBacktests: 3,
  modelVersion: "demand-baselines-v1",
  policyVersion: "forecast-readiness-v1",
} as const;

export type ForecastReadiness = "READY" | "LIMITED" | "NOT_READY";
export type ForecastEvidence = "HIGH" | "MEDIUM" | "LOW";
export type ForecastMethod =
  | "RECENT_VELOCITY"
  | "MOVING_AVERAGE"
  | "WEIGHTED_RECENT"
  | "SEASONAL_NAIVE";
export type DemandTrend = "ACCELERATING" | "STABLE" | "DECLINING" | "VOLATILE" | "INTERMITTENT";
export type DemandSeasonality =
  | "WEEKEND_HEAVY"
  | "WEEKDAY_HEAVY"
  | "NONE_DETECTED"
  | "INSUFFICIENT_HISTORY";
export type DailyDemand = {
  date: string;
  netUnits: number;
  transactions: number;
  inStock: boolean | null;
  unfulfilledDemand?: number;
};
export type BacktestMetrics = {
  samples: number;
  mae: number;
  wape: number | null;
  bias: number | null;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const standardDeviation = (values: number[]) => {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
};
const dateMs = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();
const daysBetween = (from: string, to: string) =>
  Math.max(0, Math.round((dateMs(to) - dateMs(from)) / 86_400_000));

export function assessReadiness(series: DailyDemand[], stockHistoryReliable: boolean) {
  if (!series.length)
    return {
      readiness: "NOT_READY" as const,
      evidence: "LOW" as const,
      reasons: ["No demand history is available"],
      activeDays: 0,
      transactionCount: 0,
      units: 0,
      historyDays: 0,
      intermittent: false,
    };
  const historyDays = daysBetween(series[0].date, series.at(-1)!.date) + 1;
  const available = series.filter((day) => day.inStock !== false);
  const activeDays = available.filter((day) => day.netUnits > 0).length;
  const transactionCount = available.reduce((sum, day) => sum + day.transactions, 0);
  const units = available.reduce((sum, day) => sum + Math.max(0, day.netUnits), 0);
  const intermittent = available.length > 0 && activeDays / available.length < 0.2;
  const stockoutDays = series.filter((day) => day.inStock === false).length;
  const significantStockouts = stockoutDays / series.length > 0.25;
  const reasons: string[] = [];
  if (!stockHistoryReliable)
    reasons.push("Stock or return history is incomplete or contains ambiguous adjustments");
  if (historyDays < FORECAST_POLICY.readyHistoryDays)
    reasons.push(`Only ${historyDays} history days are available`);
  if (activeDays < FORECAST_POLICY.readyActiveDays)
    reasons.push(`Only ${activeDays} active selling days are available`);
  if (transactionCount < FORECAST_POLICY.readyTransactions)
    reasons.push(`Only ${transactionCount} transactions are available`);
  if (units < FORECAST_POLICY.readyUnits) reasons.push(`Only ${units} net units are available`);
  if (intermittent) reasons.push("Demand is highly intermittent");
  if (significantStockouts)
    reasons.push(`${stockoutDays} stockout days would materially distort the forecast`);
  const ready =
    stockHistoryReliable &&
    !intermittent &&
    !significantStockouts &&
    historyDays >= FORECAST_POLICY.readyHistoryDays &&
    activeDays >= FORECAST_POLICY.readyActiveDays &&
    transactionCount >= FORECAST_POLICY.readyTransactions &&
    units >= FORECAST_POLICY.readyUnits;
  const limited =
    stockHistoryReliable &&
    !intermittent &&
    !significantStockouts &&
    historyDays >= FORECAST_POLICY.limitedHistoryDays &&
    activeDays >= FORECAST_POLICY.limitedActiveDays &&
    transactionCount >= FORECAST_POLICY.limitedTransactions &&
    units >= FORECAST_POLICY.limitedUnits;
  return {
    readiness: ready ? ("READY" as const) : limited ? ("LIMITED" as const) : ("NOT_READY" as const),
    evidence: ready ? ("HIGH" as const) : limited ? ("MEDIUM" as const) : ("LOW" as const),
    reasons,
    activeDays,
    transactionCount,
    units,
    historyDays,
    intermittent,
    significantStockouts,
  };
}

function trainingValues(series: DailyDemand[]) {
  return series.filter((day) => day.inStock !== false).map((day) => day.netUnits);
}

export function baselineForecast(
  series: DailyDemand[],
  horizonDays: number,
  method: ForecastMethod
) {
  const available = series.filter((day) => day.inStock !== false);
  const values = trainingValues(series);
  if (!values.length) return 0;
  if (method === "RECENT_VELOCITY") return Math.max(0, mean(values.slice(-30)) * horizonDays);
  if (method === "MOVING_AVERAGE") return Math.max(0, mean(values.slice(-28)) * horizonDays);
  if (method === "WEIGHTED_RECENT") {
    const weeks = [values.slice(-21, -14), values.slice(-14, -7), values.slice(-7)];
    const populated = weeks.map((week) => mean(week));
    return Math.max(0, ((populated[0] + populated[1] * 2 + populated[2] * 3) / 6) * horizonDays);
  }
  if (available.length < 84) return mean(values.slice(-28)) * horizonDays;
  const weekday = new Map<number, number[]>();
  for (const row of available) {
    const key = new Date(`${row.date}T00:00:00.000Z`).getUTCDay();
    weekday.set(key, [...(weekday.get(key) ?? []), Math.max(0, row.netUnits)]);
  }
  const last = dateMs(series.at(-1)!.date);
  let total = 0;
  for (let offset = 1; offset <= horizonDays; offset += 1) {
    const key = new Date(last + offset * 86_400_000).getUTCDay();
    total += mean(weekday.get(key) ?? values);
  }
  return Math.max(0, total);
}

export function errorMetrics(actual: number[], forecast: number[]): BacktestMetrics {
  if (actual.length !== forecast.length || !actual.length)
    return { samples: 0, mae: 0, wape: null, bias: null };
  const errors = forecast.map((value, index) => value - actual[index]);
  const absolute = errors.map(Math.abs);
  const actualTotal = actual.reduce((sum, value) => sum + Math.abs(value), 0);
  return {
    samples: actual.length,
    mae: round(mean(absolute)),
    wape:
      actualTotal > 0
        ? round((absolute.reduce((sum, value) => sum + value, 0) / actualTotal) * 100, 1)
        : null,
    bias:
      actualTotal > 0
        ? round((errors.reduce((sum, value) => sum + value, 0) / actualTotal) * 100, 1)
        : null,
  };
}

export function backtest(
  series: DailyDemand[],
  horizonDays: number,
  method: ForecastMethod
): BacktestMetrics {
  const actual: number[] = [];
  const predicted: number[] = [];
  const minimumTraining = method === "SEASONAL_NAIVE" ? 84 : 28;
  const step = Math.max(7, horizonDays);
  for (let cutoff = minimumTraining; cutoff + horizonDays <= series.length; cutoff += step) {
    const training = series.slice(0, cutoff);
    const future = series.slice(cutoff, cutoff + horizonDays);
    predicted.push(baselineForecast(training, horizonDays, method));
    actual.push(future.reduce((sum, day) => sum + Math.max(0, day.netUnits), 0));
  }
  return errorMetrics(actual, predicted);
}

export function forecastAtCutoff(
  series: DailyDemand[],
  cutoffDate: string,
  horizonDays: number,
  method: ForecastMethod
) {
  return baselineForecast(
    series.filter((day) => day.date <= cutoffDate),
    horizonDays,
    method
  );
}

export function detectSeasonality(series: DailyDemand[]): DemandSeasonality {
  const available = series.filter((day) => day.inStock !== false);
  if (available.length < 84) return "INSUFFICIENT_HISTORY";
  const weekend: number[] = [];
  const weekday: number[] = [];
  for (const row of available) {
    const day = new Date(`${row.date}T00:00:00.000Z`).getUTCDay();
    (day === 0 || day === 6 ? weekend : weekday).push(Math.max(0, row.netUnits));
  }
  const weekendMean = mean(weekend);
  const weekdayMean = mean(weekday);
  if (weekdayMean > 0 && weekendMean >= weekdayMean * 1.5) return "WEEKEND_HEAVY";
  if (weekendMean > 0 && weekdayMean >= weekendMean * 1.5) return "WEEKDAY_HEAVY";
  return "NONE_DETECTED";
}

export function detectTrend(series: DailyDemand[]): DemandTrend {
  const values = trainingValues(series);
  const activeRatio = values.length
    ? values.filter((value) => value > 0).length / values.length
    : 0;
  if (values.length >= 28 && activeRatio < 0.2) return "INTERMITTENT";
  const recent = values.slice(-14);
  const previous = values.slice(-42, -14);
  const recentMean = mean(recent);
  const previousMean = mean(previous);
  const cv =
    mean(values.slice(-60)) > 0
      ? standardDeviation(values.slice(-60)) / mean(values.slice(-60))
      : 0;
  if (cv > 1.25) return "VOLATILE";
  if (previousMean > 0 && recentMean / previousMean >= 1.25) return "ACCELERATING";
  if (previousMean > 0 && recentMean / previousMean <= 0.75) return "DECLINING";
  return "STABLE";
}

export function buildForecast(
  series: DailyDemand[],
  horizonDays: 7 | 30,
  stockHistoryReliable: boolean
) {
  const readiness = assessReadiness(series, stockHistoryReliable);
  const methods: ForecastMethod[] = [
    "RECENT_VELOCITY",
    "MOVING_AVERAGE",
    "WEIGHTED_RECENT",
    "SEASONAL_NAIVE",
  ];
  const evaluations = methods.map((method) => ({
    method,
    metrics: backtest(series, horizonDays, method),
  }));
  const evidence = {
    stockoutDays: series.filter((day) => day.inStock === false).length,
    demandPressure: series.reduce((sum, day) => sum + Math.max(0, day.unfulfilledDemand ?? 0), 0),
    unusualDemandSpike: false,
    seasonality: detectSeasonality(series),
    historyFrom: series[0]?.date ?? null,
    historyTo: series.at(-1)?.date ?? null,
  };
  if (readiness.readiness === "NOT_READY")
    return {
      readiness,
      horizonDays,
      forecast: null,
      evaluations,
      trend: detectTrend(series),
      evidence,
    };
  const eligible = evaluations.filter(
    (row) => row.metrics.samples >= FORECAST_POLICY.minimumBacktests && row.metrics.wape !== null
  );
  const selected =
    eligible.toSorted(
      (a, b) => a.metrics.wape! - b.metrics.wape! || a.method.localeCompare(b.method)
    )[0] ?? evaluations[0];
  const expected = Math.max(0, baselineForecast(series, horizonDays, selected.method));
  const recent = trainingValues(series).slice(-60);
  const uncertainty = Math.max(
    selected.metrics.mae * 1.28,
    standardDeviation(recent) * Math.sqrt(horizonDays) * 1.28,
    expected * (readiness.evidence === "HIGH" ? 0.15 : 0.3)
  );
  const lower = Math.max(0, expected - uncertainty);
  const upper = Math.max(expected, expected + uncertainty);
  const positive = recent.filter((value) => value > 0);
  const unusualDemandSpike =
    positive.length >= 5 &&
    Math.max(...positive) >
      Math.max(mean(positive) + standardDeviation(positive) * 3, median(positive) * 4);
  return {
    readiness,
    horizonDays,
    forecast: {
      expected: round(expected, 1),
      lower: round(lower, 1),
      upper: round(upper, 1),
      method: selected.method,
      metrics: selected.metrics,
    },
    evaluations,
    trend: detectTrend(series),
    evidence: { ...evidence, unusualDemandSpike },
  };
}

export function forecastStockout(input: {
  currentStock: number;
  usefulInbound: number;
  transferInbound: number;
  forecast: { expected: number; lower: number; upper: number; horizonDays: number } | null;
}) {
  if (!input.forecast)
    return { risk: "UNAVAILABLE" as const, shortageUnits: null, shortageWindow: null };
  const available = Math.max(0, input.currentStock + input.usefulInbound + input.transferInbound);
  const shortageUnits = Math.max(0, Math.ceil(input.forecast.expected - available));
  const risk =
    available < input.forecast.lower
      ? ("CRITICAL" as const)
      : available < input.forecast.expected
        ? ("HIGH" as const)
        : available < input.forecast.upper
          ? ("MEDIUM" as const)
          : ("LOW" as const);
  const earliest =
    input.forecast.upper > 0
      ? Math.max(0, Math.floor(available / (input.forecast.upper / input.forecast.horizonDays)))
      : null;
  const latest =
    input.forecast.lower > 0
      ? Math.max(
          earliest ?? 0,
          Math.ceil(available / (input.forecast.lower / input.forecast.horizonDays))
        )
      : null;
  return {
    risk,
    shortageUnits,
    shortageWindow: risk === "LOW" ? null : { earliestDays: earliest, latestDays: latest },
  };
}

export function forecastAwareRequirement(input: {
  deterministicQuantity: number | null;
  currentStock: number;
  usefulInbound: number;
  safetyStock: number;
  leadTimeDays: number;
  forecast30: { expected: number; upper: number; evidence: ForecastEvidence } | null;
}) {
  if (!input.forecast30 || input.forecast30.evidence === "LOW")
    return { quantity: input.deterministicQuantity, source: "DETERMINISTIC_FALLBACK" as const };
  const leadExpected = (input.forecast30.expected / 30) * input.leadTimeDays;
  const uncertaintyBuffer = Math.max(
    input.safetyStock,
    ((input.forecast30.upper - input.forecast30.expected) / 30) * input.leadTimeDays
  );
  return {
    quantity: Math.max(
      0,
      Math.ceil(leadExpected + uncertaintyBuffer - input.currentStock - input.usefulInbound)
    ),
    source: "FORECAST_ADJUSTED" as const,
  };
}

export function customerReturnSignal(purchaseDates: string[], asOf: string) {
  const sorted = [...new Set(purchaseDates)].sort();
  if (sorted.length < 3)
    return {
      status: "INSUFFICIENT_HISTORY" as const,
      typicalIntervalDays: null,
      overdueDays: null,
      evidence: "LOW" as const,
    };
  const intervals = sorted.slice(1).map((date, index) => daysBetween(sorted[index], date));
  const typical = Math.max(1, Math.round(median(intervals)));
  const variation = median(intervals.map((value) => Math.abs(value - typical)));
  const since = daysBetween(sorted.at(-1)!, asOf);
  const overdue = since - typical;
  const threshold = typical + Math.max(3, variation);
  const status =
    since > Math.max(typical * 2, typical + 30)
      ? ("LIKELY_DORMANT" as const)
      : since > threshold
        ? ("RETURN_DUE" as const)
        : ("ACTIVE" as const);
  return {
    status,
    typicalIntervalDays: typical,
    overdueDays: Math.max(0, overdue),
    evidence: intervals.length >= 4 ? ("HIGH" as const) : ("MEDIUM" as const),
  };
}

export function validateCustomerReturnSignals(purchaseDates: string[]) {
  const sorted = [...new Set(purchaseDates)].sort();
  const delays: number[] = [];
  for (let nextIndex = 3; nextIndex < sorted.length; nextIndex += 1) {
    const history = sorted.slice(0, nextIndex);
    const intervals = history.slice(1).map((date, index) => daysBetween(history[index], date));
    const typical = Math.max(1, Math.round(median(intervals)));
    const variation = median(intervals.map((value) => Math.abs(value - typical)));
    const dueDateMs = dateMs(history.at(-1)!) + (typical + Math.max(3, variation)) * 86_400_000;
    delays.push(Math.max(0, Math.round((dateMs(sorted[nextIndex]) - dueDateMs) / 86_400_000)));
  }
  const rate = (days: number) =>
    delays.length
      ? round((delays.filter((delay) => delay <= days).length / delays.length) * 100, 1)
      : null;
  return {
    samples: delays.length,
    returnedWithin7Days: rate(7),
    returnedWithin30Days: rate(30),
    returnedWithin60Days: rate(60),
  };
}

export function supplierDeliveryRisk(input: {
  leadTimes: number[];
  orderedAt: string;
  expectedDate: string | null;
  asOf: string;
}) {
  if (input.expectedDate && input.expectedDate < input.asOf)
    return {
      status: "OVERDUE" as const,
      typicalLeadDays: input.leadTimes.length ? round(median(input.leadTimes), 1) : null,
      variationDays: input.leadTimes.length ? round(standardDeviation(input.leadTimes), 1) : null,
    };
  if (input.leadTimes.length < 3)
    return { status: "INSUFFICIENT_HISTORY" as const, typicalLeadDays: null, variationDays: null };
  const typical = median(input.leadTimes);
  const variation = standardDeviation(input.leadTimes);
  const elapsed = daysBetween(input.orderedAt, input.asOf);
  const expectedRemaining = input.expectedDate ? daysBetween(input.asOf, input.expectedDate) : null;
  const atRisk =
    elapsed > typical + variation ||
    (expectedRemaining !== null && expectedRemaining <= 3 && variation > typical * 0.35);
  return {
    status: atRisk ? ("AT_RISK" as const) : ("ON_TRACK" as const),
    typicalLeadDays: round(typical, 1),
    variationDays: round(variation, 1),
  };
}

export function forecastProtectedTransfer(input: {
  sourceStock: number;
  sourceUpperDemand: number;
  destinationStock: number;
  destinationUpperDemand: number;
  safetyBuffer: number;
}) {
  const protectedSource = Math.ceil(input.sourceUpperDemand + input.safetyBuffer);
  const transferable = Math.max(0, input.sourceStock - protectedSource);
  const destinationNeed = Math.max(
    0,
    Math.ceil(input.destinationUpperDemand + input.safetyBuffer - input.destinationStock)
  );
  return {
    protectedSource,
    transferable,
    destinationNeed,
    quantity: Math.min(transferable, destinationNeed),
  };
}
