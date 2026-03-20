import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/**
 * Format a date to a readable string.
 */
export function formatDate(date: Date | string, format = "DD MMM YYYY"): string {
  return dayjs(date).format(format);
}

/**
 * Format a date to a datetime string.
 */
export function formatDateTime(date: Date | string): string {
  return dayjs(date).format("DD MMM YYYY, hh:mm A");
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date | string): string {
  return dayjs(date).fromNow();
}
