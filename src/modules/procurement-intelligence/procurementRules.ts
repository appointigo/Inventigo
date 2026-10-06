export type ReceiptQuantity = { received: number; accepted: number; rejected: number; damaged: number };

export function validateReceiptQuantity(value: ReceiptQuantity) {
  if (![value.received, value.accepted, value.rejected, value.damaged].every(Number.isInteger)) throw new Error("Receipt quantities must be whole numbers");
  if (value.received <= 0 || value.accepted < 0 || value.rejected < 0 || value.damaged < 0) throw new Error("Receipt quantities cannot be negative");
  if (value.accepted + value.rejected + value.damaged !== value.received) throw new Error("Accepted, rejected and damaged quantities must equal received quantity");
}

export function purchaseOrderLineState(ordered: number, accepted: number) {
  if (accepted <= 0) return "NOT_RECEIVED" as const;
  if (accepted < ordered) return "PARTIALLY_RECEIVED" as const;
  if (accepted === ordered) return "FULLY_RECEIVED" as const;
  return "OVER_RECEIVED" as const;
}

export function purchaseOrderStatus(lines: Array<{ ordered: number; accepted: number }>) {
  return lines.every((line) => line.accepted >= line.ordered) ? "RECEIVED" as const : lines.some((line) => line.accepted > 0) ? "PARTIALLY_RECEIVED" as const : "ORDERED" as const;
}

export const outstandingQuantity = (ordered: number, accepted: number) => Math.max(0, ordered - accepted);
export const fillRate = (ordered: number, accepted: number) => ordered > 0 ? Number((accepted / ordered * 100).toFixed(1)) : null;

export function businessDaysBetween(start: Date, end: Date, offsetMinutes = 330) {
  const date = (value: Date) => new Date(value.getTime() + offsetMinutes * 60_000);
  const left = date(start); const right = date(end);
  const leftDay = Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate());
  const rightDay = Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate());
  return Math.floor((rightDay - leftDay) / 86_400_000);
}

export function deliveryTiming(expected: Date | null, completed: Date | null) {
  if (!expected || !completed) return { onTime: null, delayDays: null };
  const delayDays = businessDaysBetween(expected, completed);
  return { onTime: delayDays <= 0, delayDays: Math.max(0, delayDays) };
}

export function costChange(previous: number | null, current: number) {
  return previous === null || previous === 0 ? null : Number(((current - previous) / Math.abs(previous) * 100).toFixed(1));
}

export function inboundDecision(input: { currentStock: number; inbound: number; requiredUnits: number; overdue: boolean }) {
  if (input.inbound >= input.requiredUnits && !input.overdue) return "INBOUND_STOCK" as const;
  if (input.currentStock + input.inbound < input.requiredUnits || input.overdue) return "ACTION_REQUIRED" as const;
  return "MONITOR" as const;
}
