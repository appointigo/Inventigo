import type { AnalyticsGroup } from "../types";
import { businessDateStart, isBusinessDate } from "./dateRange.ts";

export class AnalyticsQueryError extends Error {}

export function parseAnalyticsQuery(searchParams: URLSearchParams) {
  const fromValue = searchParams.get("from");
  const toValue = searchParams.get("to");
  const groupValue = searchParams.get("group") ?? "day";
  const group: AnalyticsGroup | null = ["day", "week", "month", "year"].includes(groupValue)
    ? (groupValue as AnalyticsGroup)
    : null;
  if (!fromValue || !toValue || !group || !isBusinessDate(fromValue) || !isBusinessDate(toValue)) {
    throw new AnalyticsQueryError("A valid from, to and group are required");
  }
  const from = businessDateStart(fromValue);
  const to = businessDateStart(toValue);
  if (from > to) throw new AnalyticsQueryError("A valid from, to and group are required");
  if (to.getTime() - from.getTime() > 730 * 86_400_000) {
    throw new AnalyticsQueryError("Analytics ranges cannot exceed two years");
  }
  return { from, to, group };
}
