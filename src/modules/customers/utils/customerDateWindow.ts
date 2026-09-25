export const CUSTOMER_DATE_PRESETS = [7, 30, 90, 180] as const;
export type CustomerDatePreset = (typeof CUSTOMER_DATE_PRESETS)[number];

export const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Kolkata";

export type CustomerDateWindow = {
  startInclusive: Date;
  endExclusive: Date;
};

const calendarParts = (value: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
};

const zonedMidnightToUtc = (year: number, month: number, day: number, timeZone: string) => {
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;

  // Two passes handle time zones whose offset changes around the target date.
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const representedAsUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );
    candidate = target - (representedAsUtc - candidate);
  }

  return new Date(candidate);
};

/** Inclusive local calendar days, represented as a half-open UTC interval. */
export function getCustomerDateWindow(
  days: CustomerDatePreset,
  now = new Date(),
  timeZone = DEFAULT_BUSINESS_TIME_ZONE
): CustomerDateWindow {
  const current = calendarParts(now, timeZone);
  const localDay = Date.UTC(current.year, current.month - 1, current.day);
  const startDay = new Date(localDay - (days - 1) * 86_400_000);
  const endDay = new Date(localDay + 86_400_000);

  return {
    startInclusive: zonedMidnightToUtc(
      startDay.getUTCFullYear(),
      startDay.getUTCMonth() + 1,
      startDay.getUTCDate(),
      timeZone
    ),
    endExclusive: zonedMidnightToUtc(
      endDay.getUTCFullYear(),
      endDay.getUTCMonth() + 1,
      endDay.getUTCDate(),
      timeZone
    ),
  };
}

export function isInCustomerDateWindow(value: string | Date | null, window: CustomerDateWindow) {
  if (!value) return false;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp >= window.startInclusive.getTime() &&
    timestamp < window.endExclusive.getTime()
  );
}
