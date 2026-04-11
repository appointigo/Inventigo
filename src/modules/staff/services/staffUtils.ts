import type { AuthUser } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";

export type OrgAuthUser = AuthUser & { orgId: string };

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed;
}

export function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function toDateRange(from?: string | null, to?: string | null): { start: Date; end: Date } {
  const today = parseDateOnly(formatDateOnly(new Date()));
  const end = to ? parseDateOnly(to) : today;
  const start = from ? parseDateOnly(from) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 29));
  if (start > end) {
    throw new Error("From date cannot be after To date");
  }
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (diff > 92) {
    throw new Error("Date range cannot exceed 93 days");
  }
  return { start, end };
}

export function calculateTotalMinutes(checkInAt: Date | null, checkOutAt: Date | null): number | null {
  if (!checkInAt || !checkOutAt) return null;
  const diff = Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60000);
  return diff >= 0 ? diff : null;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "0h 0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

export async function resolveAccessibleStoreId(
  actor: OrgAuthUser,
  requestedStoreId?: string | null
): Promise<string> {
  const storeId = actor.storeId ?? requestedStoreId;
  if (!storeId) {
    throw new Error("A store must be selected");
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId: actor.orgId, isActive: true },
    select: { id: true },
  });
  if (!store) {
    throw new Error("Store not found");
  }

  if ((actor.role === "MANAGER" || actor.role === "STAFF") && actor.storeId !== storeId) {
    throw new Error("Forbidden");
  }

  return storeId;
}

export function canManageWorkforce(role: OrgAuthUser["role"]): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function ensureManageWorkforce(actor: OrgAuthUser) {
  if (!canManageWorkforce(actor.role)) {
    throw new Error("Forbidden");
  }
}

export function isWeeklyOff(dayOfWeek: number, weeklyOffDays: Set<number>): boolean {
  return weeklyOffDays.has(dayOfWeek);
}