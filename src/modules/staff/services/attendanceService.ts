import { prisma } from "@/lib/db";
import type { AttendanceHistoryResponse, AttendanceOverrideInput, AttendanceRecord } from "../types";
import {
  calculateTotalMinutes,
  eachDateInRange,
  ensureManageWorkforce,
  formatDateOnly,
  formatMinutes,
  parseDateOnly,
  resolveAccessibleStoreId,
  toDateRange,
  type OrgAuthUser,
} from "./staffUtils";
import { weeklyOffService } from "./weeklyOffService";

type HistoryOptions = {
  from?: string | null;
  to?: string | null;
  userId?: string | null;
  storeId?: string | null;
  status?: string | null;
};

function toIsoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export const attendanceService = {
  async checkIn(actor: OrgAuthUser, requestedStoreId?: string | null): Promise<AttendanceRecord> {
    const storeId = await resolveAccessibleStoreId(actor, requestedStoreId);
    const today = formatDateOnly(new Date());
    const date = parseDateOnly(today);

    const weeklyOffs = await weeklyOffService.getWeeklyOffSet(actor.orgId, storeId);
    if (weeklyOffs.has(date.getUTCDay())) {
      throw new Error("Cannot clock in on a weekly off day");
    }

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        orgId: actor.orgId,
        userId: actor.id,
        status: "APPROVED",
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true },
    });
    if (approvedLeave) {
      throw new Error("Cannot clock in while on approved leave");
    }

    const existing = await prisma.staffAttendance.findUnique({
      where: { userId_date: { userId: actor.id, date } },
      include: { user: true, store: true },
    });

    if (existing?.checkInAt) {
      throw new Error("You have already clocked in today");
    }
    if (existing?.source === "MANUAL" && existing.status !== "PRESENT") {
      throw new Error(`Attendance already marked as ${existing.status.toLowerCase()}`);
    }

    const now = new Date();
    const record = existing
      ? await prisma.staffAttendance.update({
          where: { id: existing.id },
          data: {
            status: "PRESENT",
            checkInAt: now,
            checkOutAt: null,
            totalMinutes: null,
            note: existing.note,
            source: "SYSTEM",
            overrideReason: null,
            overriddenBy: null,
          },
          include: { user: true, store: true },
        })
      : await prisma.staffAttendance.create({
          data: {
            orgId: actor.orgId,
            storeId,
            userId: actor.id,
            date,
            status: "PRESENT",
            checkInAt: now,
            source: "SYSTEM",
          },
          include: { user: true, store: true },
        });

    return {
      id: record.id,
      userId: record.userId,
      userName: record.user.name,
      storeId: record.storeId,
      storeName: record.store.name,
      date: formatDateOnly(record.date),
      status: "PRESENT",
      checkInAt: toIsoOrNull(record.checkInAt),
      checkOutAt: toIsoOrNull(record.checkOutAt),
      totalMinutes: record.totalMinutes,
      totalHoursLabel: formatMinutes(record.totalMinutes),
      note: record.note ?? null,
      isOverride: record.source === "MANUAL",
    };
  },

  async checkOut(actor: OrgAuthUser, requestedStoreId?: string | null): Promise<AttendanceRecord> {
    const storeId = await resolveAccessibleStoreId(actor, requestedStoreId);
    const date = parseDateOnly(formatDateOnly(new Date()));

    const existing = await prisma.staffAttendance.findUnique({
      where: { userId_date: { userId: actor.id, date } },
      include: { user: true, store: true },
    });
    if (!existing?.checkInAt) {
      throw new Error("You must clock in before clocking out");
    }
    if (existing.checkOutAt) {
      throw new Error("You have already clocked out today");
    }
    if (existing.storeId !== storeId) {
      throw new Error("Attendance store mismatch");
    }

    const checkOutAt = new Date();
    const totalMinutes = calculateTotalMinutes(existing.checkInAt, checkOutAt);
    const record = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        checkOutAt,
        totalMinutes,
      },
      include: { user: true, store: true },
    });

    return {
      id: record.id,
      userId: record.userId,
      userName: record.user.name,
      storeId: record.storeId,
      storeName: record.store.name,
      date: formatDateOnly(record.date),
      status: record.status,
      checkInAt: toIsoOrNull(record.checkInAt),
      checkOutAt: toIsoOrNull(record.checkOutAt),
      totalMinutes: record.totalMinutes,
      totalHoursLabel: formatMinutes(record.totalMinutes),
      note: record.note ?? null,
      isOverride: record.source === "MANUAL",
    };
  },

  async history(actor: OrgAuthUser, options: HistoryOptions): Promise<AttendanceHistoryResponse> {
    const { start, end } = toDateRange(options.from, options.to);
    const today = formatDateOnly(new Date());
    const scopeStoreId = actor.role === "STAFF"
      ? actor.storeId
      : actor.role === "MANAGER"
        ? actor.storeId
        : options.storeId ?? actor.storeId ?? undefined;

    const users = await prisma.user.findMany({
      where: {
        orgId: actor.orgId,
        isActive: true,
        ...(actor.role === "STAFF" ? { id: actor.id } : {}),
        ...(options.userId ? { id: options.userId } : {}),
        ...(scopeStoreId ? { storeId: scopeStoreId } : {}),
      },
      include: { store: { select: { name: true } } },
      orderBy: [{ name: "asc" }],
    });

    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) {
      return { today: null, records: [] };
    }

    const attendanceRows = await prisma.staffAttendance.findMany({
      where: {
        orgId: actor.orgId,
        userId: { in: userIds },
        date: { gte: start, lte: end },
      },
      orderBy: [{ date: "desc" }],
    });

    const leaveRows = await prisma.leaveRequest.findMany({
      where: {
        orgId: actor.orgId,
        userId: { in: userIds },
        status: "APPROVED",
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    const weeklyOffByStore = new Map<string, Set<number>>();
    for (const user of users) {
      if (user.storeId && !weeklyOffByStore.has(user.storeId)) {
        weeklyOffByStore.set(
          user.storeId,
          await weeklyOffService.getWeeklyOffSet(actor.orgId, user.storeId)
        );
      }
    }

    const attendanceMap = new Map(attendanceRows.map((row) => [`${row.userId}:${formatDateOnly(row.date)}`, row]));
    const leaveMap = new Map<string, true>();
    for (const leave of leaveRows) {
      for (const day of eachDateInRange(leave.startDate, leave.endDate)) {
        leaveMap.set(`${leave.userId}:${formatDateOnly(day)}`, true);
      }
    }

    const records: AttendanceRecord[] = [];
    for (const user of users) {
      for (const day of eachDateInRange(start, end).reverse()) {
        const dateKey = formatDateOnly(day);
        const attendanceKey = `${user.id}:${dateKey}`;
        const row = attendanceMap.get(attendanceKey);
        const weeklyOffs = user.storeId ? weeklyOffByStore.get(user.storeId) ?? new Set<number>() : new Set<number>();
        const onLeave = leaveMap.has(attendanceKey);

        let status = row?.status ?? "ABSENT";
        if (!row || row.source !== "MANUAL") {
          if (weeklyOffs.has(day.getUTCDay())) {
            status = "OFF";
          } else if (onLeave) {
            status = "LEAVE";
          } else if (row?.checkInAt) {
            status = "PRESENT";
          } else {
            status = "ABSENT";
          }
        }

        const dynamicMinutes = row?.checkInAt && !row.checkOutAt && dateKey === today
          ? calculateTotalMinutes(row.checkInAt, new Date())
          : row?.totalMinutes ?? null;

        const record: AttendanceRecord = {
          id: row?.id ?? null,
          userId: user.id,
          userName: user.name,
          storeId: user.storeId ?? null,
          storeName: user.store?.name ?? null,
          date: dateKey,
          status,
          checkInAt: toIsoOrNull(row?.checkInAt),
          checkOutAt: toIsoOrNull(row?.checkOutAt),
          totalMinutes: dynamicMinutes,
          totalHoursLabel: formatMinutes(dynamicMinutes),
          note: row?.note ?? null,
          isOverride: row?.source === "MANUAL",
        };

        if (!options.status || record.status === options.status) {
          records.push(record);
        }
      }
    }

    const todayRecord = records.find((record) => record.userId === actor.id && record.date === today) ?? null;
    return { today: todayRecord, records };
  },

  async override(actor: OrgAuthUser, input: AttendanceOverrideInput): Promise<AttendanceRecord> {
    ensureManageWorkforce(actor);
    const date = parseDateOnly(input.date);
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.userId,
        orgId: actor.orgId,
        ...(actor.role === "MANAGER" && actor.storeId ? { storeId: actor.storeId } : {}),
      },
      include: { store: { select: { name: true } } },
    });
    if (!targetUser) {
      throw new Error("User not found");
    }

    const storeId = await resolveAccessibleStoreId(actor, input.storeId ?? targetUser.storeId);
    const checkInAt = input.checkInAt ? new Date(input.checkInAt) : null;
    const checkOutAt = input.checkOutAt ? new Date(input.checkOutAt) : null;
    const totalMinutes = calculateTotalMinutes(checkInAt, checkOutAt);

    const record = await prisma.staffAttendance.upsert({
      where: { userId_date: { userId: targetUser.id, date } },
      update: {
        storeId,
        status: input.status,
        checkInAt,
        checkOutAt,
        totalMinutes,
        note: input.note ?? null,
        source: "MANUAL",
        overrideReason: input.overrideReason,
        overriddenBy: actor.id,
      },
      create: {
        orgId: actor.orgId,
        storeId,
        userId: targetUser.id,
        date,
        status: input.status,
        checkInAt,
        checkOutAt,
        totalMinutes,
        note: input.note ?? null,
        source: "MANUAL",
        overrideReason: input.overrideReason,
        overriddenBy: actor.id,
      },
      include: { user: true, store: true },
    });

    return {
      id: record.id,
      userId: record.userId,
      userName: record.user.name,
      storeId: record.storeId,
      storeName: record.store.name,
      date: formatDateOnly(record.date),
      status: record.status,
      checkInAt: toIsoOrNull(record.checkInAt),
      checkOutAt: toIsoOrNull(record.checkOutAt),
      totalMinutes: record.totalMinutes,
      totalHoursLabel: formatMinutes(record.totalMinutes),
      note: record.note ?? null,
      isOverride: true,
    };
  },
};