import dayjs from "dayjs";

export function formatBusinessDate(bd: any) {
  if (!bd) return { date: "—", time: null };
  // If backend returns a date-only string like '2026-08-13', avoid inventing a time
  if (typeof bd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(bd)) {
    return { date: dayjs(bd).format("DD MMM YYYY"), time: null };
  }

  // If backend returns an ISO timestamp with time 00:00:00Z (UTC midnight),
  // it may be a date-only value serialized as UTC. Detect and avoid showing local time.
  if (typeof bd === "string" && /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(bd)) {
    return { date: dayjs(bd).format("DD MMM YYYY"), time: null };
  }

  const d = dayjs(bd);
  if (!d.isValid()) return { date: String(bd), time: null };
  return { date: d.format("DD MMM YYYY"), time: d.format("h:mm A") };
}
