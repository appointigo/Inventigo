import type {
  AnalyticsGranularity,
  AnalyticsPeriod,
  AnalyticsWindow,
  InventoryComparisonMode,
  InventoryPeriodPreset,
} from "../types";

export class AnalyticsPeriodError extends Error {}

const PERIODS = new Set<InventoryPeriodPreset>([
  "weekly",
  "monthly",
  "quarterly",
  "halfYearly",
  "annual",
  "custom",
]);
const COMPARISONS = new Set<InventoryComparisonMode>(["previousPeriod", "previousYear"]);

const DAY_MS = 86_400_000;
export const STOCKIVA_TIME_ZONE_OFFSET_MINUTES = 330;

const localParts = (date: Date, offsetMinutes: number) => {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekDay: shifted.getUTCDay(),
  };
};

const localDate = (year: number, month: number, day: number, offsetMinutes: number) =>
  new Date(Date.UTC(year, month, day) - offsetMinutes * 60_000);

const addLocalDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

const addLocalMonths = (date: Date, months: number, offsetMinutes: number) => {
  const p = localParts(date, offsetMinutes);
  return localDate(p.year, p.month + months, p.day, offsetMinutes);
};

const formatLabel = (start: Date, end: Date, offsetMinutes: number) => {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const shiftedStart = new Date(start.getTime() + offsetMinutes * 60_000);
  const inclusiveEnd = new Date(end.getTime() - 1 + offsetMinutes * 60_000);
  return `${formatter.format(shiftedStart)} – ${formatter.format(inclusiveEnd)}`;
};

const windowOf = (start: Date, end: Date, offsetMinutes: number): AnalyticsWindow => ({
  start: start.toISOString(),
  end: end.toISOString(),
  label: formatLabel(start, end, offsetMinutes),
});

const presetBounds = (
  preset: Exclude<InventoryPeriodPreset, "custom">,
  now: Date,
  offsetMinutes: number
) => {
  const p = localParts(now, offsetMinutes);
  let start: Date;
  let naturalEnd: Date;

  if (preset === "weekly") {
    const daysSinceMonday = (p.weekDay + 6) % 7;
    start = localDate(p.year, p.month, p.day - daysSinceMonday, offsetMinutes);
    naturalEnd = addLocalDays(start, 7);
  } else if (preset === "monthly") {
    start = localDate(p.year, p.month, 1, offsetMinutes);
    naturalEnd = localDate(p.year, p.month + 1, 1, offsetMinutes);
  } else if (preset === "quarterly") {
    const quarterStart = Math.floor(p.month / 3) * 3;
    start = localDate(p.year, quarterStart, 1, offsetMinutes);
    naturalEnd = localDate(p.year, quarterStart + 3, 1, offsetMinutes);
  } else if (preset === "halfYearly") {
    const halfStart = p.month < 6 ? 0 : 6;
    start = localDate(p.year, halfStart, 1, offsetMinutes);
    naturalEnd = localDate(p.year, halfStart + 6, 1, offsetMinutes);
  } else {
    start = localDate(p.year, 0, 1, offsetMinutes);
    naturalEnd = localDate(p.year + 1, 0, 1, offsetMinutes);
  }

  return { start, naturalEnd, end: new Date(Math.min(naturalEnd.getTime(), now.getTime())) };
};

const granularityFor = (durationDays: number): AnalyticsGranularity =>
  durationDays <= 45 ? "day" : durationDays <= 210 ? "week" : "month";

const previousYearDate = (date: Date, offsetMinutes: number) => {
  const p = localParts(date, offsetMinutes);
  const targetDay = p.month === 1 && p.day === 29 ? 28 : p.day;
  return localDate(p.year - 1, p.month, targetDay, offsetMinutes);
};

export function resolveAnalyticsPeriod(input: {
  preset: InventoryPeriodPreset;
  comparisonMode: InventoryComparisonMode;
  now?: Date;
  customStart?: Date;
  customEnd?: Date;
  timeZoneOffsetMinutes?: number;
}): AnalyticsPeriod {
  const offset = input.timeZoneOffsetMinutes ?? STOCKIVA_TIME_ZONE_OFFSET_MINUTES;
  const now = input.now ?? new Date();
  let start: Date;
  let end: Date;
  let naturalEnd: Date;

  if (input.preset === "custom") {
    if (!input.customStart || !input.customEnd) {
      throw new AnalyticsPeriodError("Custom period requires start and end dates");
    }
    start = input.customStart;
    end = input.customEnd;
    naturalEnd = end;
  } else {
    ({ start, end, naturalEnd } = presetBounds(input.preset, now, offset));
  }

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    throw new AnalyticsPeriodError("Analytics date range is invalid");
  }
  if (end.getTime() - start.getTime() > 731 * DAY_MS) {
    throw new AnalyticsPeriodError("Analytics date range cannot exceed two years");
  }

  const elapsed = end.getTime() - start.getTime();
  let comparisonStart: Date;
  let comparisonNaturalEnd: Date;

  if (input.comparisonMode === "previousYear") {
    comparisonStart = previousYearDate(start, offset);
    comparisonNaturalEnd = previousYearDate(naturalEnd, offset);
  } else if (input.preset === "weekly" || input.preset === "custom") {
    comparisonNaturalEnd = start;
    comparisonStart = new Date(start.getTime() - (naturalEnd.getTime() - start.getTime()));
  } else {
    const months =
      input.preset === "monthly"
        ? -1
        : input.preset === "quarterly"
          ? -3
          : input.preset === "halfYearly"
            ? -6
            : -12;
    comparisonStart = addLocalMonths(start, months, offset);
    comparisonNaturalEnd = start;
  }

  const comparisonEnd = new Date(
    Math.min(comparisonStart.getTime() + elapsed, comparisonNaturalEnd.getTime())
  );
  const durationDays = Math.max(1, Math.ceil(elapsed / DAY_MS));

  return {
    current: windowOf(start, end, offset),
    comparison: windowOf(comparisonStart, comparisonEnd, offset),
    granularity: granularityFor(durationDays),
    preset: input.preset,
    comparisonMode: input.comparisonMode,
  };
}

export function parseInventoryAnalyticsSearchParams(
  searchParams: URLSearchParams,
  fallbackStoreId?: string | null,
  now?: Date
) {
  const rawPeriod = searchParams.get("period") ?? "monthly";
  const rawComparison = searchParams.get("compare") ?? "previousPeriod";
  if (!PERIODS.has(rawPeriod as InventoryPeriodPreset)) {
    throw new AnalyticsPeriodError("Unsupported analytics period");
  }
  if (!COMPARISONS.has(rawComparison as InventoryComparisonMode)) {
    throw new AnalyticsPeriodError("Unsupported comparison mode");
  }
  const storeId = searchParams.get("storeId")?.trim() || fallbackStoreId || undefined;
  if (!storeId) throw new AnalyticsPeriodError("A current store is required");
  const parseDate = (value: string | null, label: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new AnalyticsPeriodError(`${label} is invalid`);
    return date;
  };
  return {
    storeId,
    period: resolveAnalyticsPeriod({
      preset: rawPeriod as InventoryPeriodPreset,
      comparisonMode: rawComparison as InventoryComparisonMode,
      customStart: parseDate(searchParams.get("start"), "Custom start date"),
      customEnd: parseDate(searchParams.get("end"), "Custom end date"),
      now,
    }),
  };
}
