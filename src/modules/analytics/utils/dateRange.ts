import type { AnalyticsGroup } from "../types";

export type AnalyticsDatePreset =
  | "today"
  | "7d"
  | "30d"
  | "thisMonth"
  | "90d"
  | "12m"
  | "custom";

export type AnalyticsDateRange = {
  preset: AnalyticsDatePreset;
  from: string;
  to: string;
  group: AnalyticsGroup;
};

export function buildAnalyticsSearchParams(input: {
  storeId: string;
  from: string;
  to: string;
  group?: AnalyticsGroup;
}) {
  const params = new URLSearchParams({
    storeId: input.storeId,
    from: input.from,
    to: input.to,
  });
  if (input.group) params.set("group", input.group);
  return params;
}

export const STOCKIVA_TIME_ZONE_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, "0");

function parseDateParts(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return { year, month, day, date };
}

export function isBusinessDate(value: string) {
  return parseDateParts(value) !== null;
}

export function addBusinessDays(value: string, days: number) {
  const parsed = parseDateParts(value);
  if (!parsed) throw new Error("Invalid business date");
  const next = new Date(parsed.date.getTime() + days * DAY_MS);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function businessDateForInstant(
  now = new Date(),
  offsetMinutes = STOCKIVA_TIME_ZONE_OFFSET_MINUTES,
) {
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function businessDateStart(
  value: string,
  offsetMinutes = STOCKIVA_TIME_ZONE_OFFSET_MINUTES,
) {
  const parsed = parseDateParts(value);
  if (!parsed) throw new Error("Invalid business date");
  return new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day) - offsetMinutes * 60_000,
  );
}

export function businessDateEndExclusive(
  value: string,
  offsetMinutes = STOCKIVA_TIME_ZONE_OFFSET_MINUTES,
) {
  return businessDateStart(addBusinessDays(value, 1), offsetMinutes);
}

export function analyticsGroupForRange(from: string, to: string): AnalyticsGroup {
  const start = parseDateParts(from);
  const end = parseDateParts(to);
  if (!start || !end || start.date > end.date) throw new Error("Invalid analytics date range");
  const inclusiveDays = Math.floor((end.date.getTime() - start.date.getTime()) / DAY_MS) + 1;
  if (inclusiveDays <= 31) return "day";
  if (inclusiveDays <= 210) return "week";
  return "month";
}

export function analyticsBucketKey(value: Date | string, group: AnalyticsGroup) {
  const key = typeof value === "string" ? value : businessDateForInstant(value);
  const parsed = parseDateParts(key);
  if (!parsed) throw new Error("Invalid analytics bucket date");
  if (group === "day") return key;
  if (group === "month") return `${parsed.year}-${pad(parsed.month)}-01`;
  if (group === "year") return `${parsed.year}-01-01`;
  const mondayOffset = (parsed.date.getUTCDay() + 6) % 7;
  return addBusinessDays(key, -mondayOffset);
}

export function nextAnalyticsBucket(value: string, group: AnalyticsGroup) {
  if (group === "day") return addBusinessDays(value, 1);
  if (group === "week") return addBusinessDays(value, 7);
  const parsed = parseDateParts(value);
  if (!parsed) throw new Error("Invalid analytics bucket date");
  const next = new Date(Date.UTC(
    parsed.year + (group === "year" ? 1 : 0),
    group === "month" ? parsed.month : parsed.month - 1,
    1,
  ));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`;
}

export function resolveAnalyticsDateRange(
  preset: AnalyticsDatePreset,
  custom?: { from: string; to: string } | null,
  now = new Date(),
): AnalyticsDateRange {
  const today = businessDateForInstant(now);
  let from: string;
  let to = today;

  if (preset === "custom") {
    if (!custom || !isBusinessDate(custom.from) || !isBusinessDate(custom.to)) {
      throw new Error("Custom date range requires valid start and end dates");
    }
    ({ from, to } = custom);
  } else if (preset === "today") {
    from = today;
  } else if (preset === "7d") {
    from = addBusinessDays(today, -6);
  } else if (preset === "30d") {
    from = addBusinessDays(today, -29);
  } else if (preset === "90d") {
    from = addBusinessDays(today, -89);
  } else if (preset === "12m") {
    from = addBusinessDays(today, -364);
  } else {
    from = `${today.slice(0, 8)}01`;
  }

  const start = parseDateParts(from)!;
  const end = parseDateParts(to)!;
  if (start.date > end.date) throw new Error("Start date must be on or before end date");
  if (end.date.getTime() - start.date.getTime() > 730 * DAY_MS) {
    throw new Error("Analytics ranges cannot exceed two years");
  }
  return { preset, from, to, group: analyticsGroupForRange(from, to) };
}

export function parseAnalyticsDateRange(
  searchParams: Pick<URLSearchParams, "get">,
  defaultPreset: AnalyticsDatePreset,
  now = new Date(),
) {
  const rawPreset = searchParams.get("period") as AnalyticsDatePreset | null;
  const supported = new Set<AnalyticsDatePreset>([
    "today", "7d", "30d", "thisMonth", "90d", "12m", "custom",
  ]);
  const preset = rawPreset && supported.has(rawPreset) ? rawPreset : defaultPreset;
  try {
    return resolveAnalyticsDateRange(
      preset,
      preset === "custom"
        ? { from: searchParams.get("from") ?? "", to: searchParams.get("to") ?? "" }
        : null,
      now,
    );
  } catch {
    return resolveAnalyticsDateRange(defaultPreset, null, now);
  }
}
