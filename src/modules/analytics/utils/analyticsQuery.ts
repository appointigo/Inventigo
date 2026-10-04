import dayjs from "dayjs";
import type { AnalyticsGroup } from "../types";

export class AnalyticsQueryError extends Error {}

export function parseAnalyticsQuery(searchParams: URLSearchParams) {
  const fromValue = searchParams.get("from");
  const toValue = searchParams.get("to");
  const groupValue = searchParams.get("group") ?? "day";
  const group: AnalyticsGroup | null = ["day", "week", "month", "year"].includes(groupValue)
    ? (groupValue as AnalyticsGroup)
    : null;
  const from = dayjs(fromValue).startOf("day");
  const to = dayjs(toValue).startOf("day");
  if (!fromValue || !toValue || !group || !from.isValid() || !to.isValid() || from.isAfter(to)) {
    throw new AnalyticsQueryError("A valid from, to and group are required");
  }
  if (to.diff(from, "day") > 730) {
    throw new AnalyticsQueryError("Analytics ranges cannot exceed two years");
  }
  return { from: from.toDate(), to: to.toDate(), group };
}
