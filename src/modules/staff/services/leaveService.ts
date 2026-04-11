import { prisma } from "@/lib/db";
import type { LeaveApplicationInput, LeaveDecisionInput, LeaveListResponse, LeaveRecord, LeaveType } from "../types";
import {
  eachDateInRange,
  ensureManageWorkforce,
  formatDateOnly,
  parseDateOnly,
  resolveAccessibleStoreId,
  toDateRange,
  type OrgAuthUser,
} from "./staffUtils";
import { DEFAULT_STORE_LEAVE_POLICY, leavePolicyService } from "./leavePolicyService";
import { weeklyOffService } from "./weeklyOffService";

async function ensureBalances(orgId: string, userId: string, year: number, storeId: string) {
  const policyMap = await leavePolicyService.getPolicyMap(orgId, storeId);

  await Promise.all(
    (Object.entries(DEFAULT_STORE_LEAVE_POLICY) as Array<[LeaveType, number]>).map(([leaveType, fallbackAllocated]) =>
      prisma.leaveBalance.upsert({
        where: { userId_leaveType_year: { userId, leaveType, year } },
        update: { allocated: policyMap.get(leaveType) ?? fallbackAllocated },
        create: { orgId, userId, leaveType, year, allocated: policyMap.get(leaveType) ?? fallbackAllocated },
      })
    )
  );
}

async function countChargeableDays(orgId: string, storeId: string, startDate: Date, endDate: Date): Promise<number> {
  const weeklyOffs = await weeklyOffService.getWeeklyOffSet(orgId, storeId);
  return eachDateInRange(startDate, endDate).filter((date) => !weeklyOffs.has(date.getUTCDay())).length;
}

function toLeaveRecord(row: {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerComment: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  user: { name: string };
  store: { id: string; name: string };
  reviewer: { name: string } | null;
}): LeaveRecord {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.name,
    storeId: row.store.id,
    storeName: row.store.name,
    leaveType: row.leaveType,
    startDate: formatDateOnly(row.startDate),
    endDate: formatDateOnly(row.endDate),
    reason: row.reason,
    status: row.status,
    reviewerComment: row.reviewerComment,
    reviewedByName: row.reviewer?.name ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const leaveService = {
  async apply(actor: OrgAuthUser, input: LeaveApplicationInput): Promise<LeaveRecord> {
    const startDate = parseDateOnly(input.fromDate);
    const endDate = parseDateOnly(input.toDate);
    if (startDate > endDate) {
      throw new Error("From date cannot be after To date");
    }

    const storeId = await resolveAccessibleStoreId(actor, input.storeId);
    const weeklyOffs = await weeklyOffService.getWeeklyOffSet(actor.orgId, storeId);
    const hasWeeklyOffConflict = eachDateInRange(startDate, endDate).some((date) => weeklyOffs.has(date.getUTCDay()));
    if (hasWeeklyOffConflict) {
      throw new Error("Leave cannot be requested on configured weekly off days");
    }

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        orgId: actor.orgId,
        userId: actor.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new Error("Leave dates overlap an existing request");
    }

    const record = await prisma.leaveRequest.create({
      data: {
        orgId: actor.orgId,
        storeId,
        userId: actor.id,
        leaveType: input.leaveType,
        startDate,
        endDate,
        reason: input.reason.trim(),
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
    });

    return toLeaveRecord(record);
  },

  async list(
    actor: OrgAuthUser,
    options: { storeId?: string | null; userId?: string | null; status?: string | null; from?: string | null; to?: string | null }
  ): Promise<LeaveListResponse> {
    const { start, end } = toDateRange(options.from, options.to);
    const scopedStoreId = actor.role === "STAFF"
      ? actor.storeId
      : actor.role === "MANAGER"
        ? actor.storeId
        : options.storeId ?? actor.storeId ?? undefined;

    const rows = await prisma.leaveRequest.findMany({
      where: {
        orgId: actor.orgId,
        ...(actor.role === "STAFF" ? { userId: actor.id } : {}),
        ...(options.userId ? { userId: options.userId } : {}),
        ...(scopedStoreId ? { storeId: scopedStoreId } : {}),
        ...(options.status ? { status: options.status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const balanceUserId = actor.role === "STAFF" ? actor.id : options.userId ?? actor.id;
    const balanceStoreId = options.storeId
      ?? actor.storeId
      ?? (balanceUserId
        ? (await prisma.user.findFirst({ where: { id: balanceUserId, orgId: actor.orgId }, select: { storeId: true } }))?.storeId
        : null);
    const year = end.getUTCFullYear();
    let balances = [] as Array<{ leaveType: LeaveType; year: number; allocated: number; carryForward: number; used: number }>;
    if (balanceStoreId) {
      await ensureBalances(actor.orgId, balanceUserId, year, balanceStoreId);
      balances = await prisma.leaveBalance.findMany({
        where: { orgId: actor.orgId, userId: balanceUserId, year },
        orderBy: { leaveType: "asc" },
      });
    }

    return {
      records: rows.map(toLeaveRecord),
      balances: balances.map((balance) => ({
        leaveType: balance.leaveType,
        year: balance.year,
        allocated: balance.allocated + balance.carryForward,
        used: balance.used,
        remaining: balance.allocated + balance.carryForward - balance.used,
      })),
    };
  },

  async approve(actor: OrgAuthUser, input: LeaveDecisionInput): Promise<LeaveRecord> {
    ensureManageWorkforce(actor);

    const request = await prisma.leaveRequest.findFirst({
      where: {
        id: input.leaveRequestId,
        orgId: actor.orgId,
        ...(actor.role === "MANAGER" && actor.storeId ? { storeId: actor.storeId } : {}),
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
    });
    if (!request) {
      throw new Error("Leave request not found");
    }
    if (request.status !== "PENDING") {
      throw new Error("Only pending leave requests can be approved");
    }

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        orgId: actor.orgId,
        userId: request.userId,
        status: "APPROVED",
        startDate: { lte: request.endDate },
        endDate: { gte: request.startDate },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new Error("This leave overlaps an existing approved request");
    }

    const year = request.startDate.getUTCFullYear();
    await ensureBalances(actor.orgId, request.userId, year, request.storeId);
    const chargedDays = await countChargeableDays(actor.orgId, request.storeId, request.startDate, request.endDate);

    const [updated] = await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewerComment: input.comment?.trim() || null,
          reviewedBy: actor.id,
          decidedAt: new Date(),
        },
        include: {
          user: { select: { name: true } },
          store: { select: { id: true, name: true } },
          reviewer: { select: { name: true } },
        },
      }),
      prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: request.userId,
            leaveType: request.leaveType,
            year,
          },
        },
        data: { used: { increment: chargedDays } },
      }),
    ]);

    return toLeaveRecord(updated);
  },

  async reject(actor: OrgAuthUser, input: LeaveDecisionInput): Promise<LeaveRecord> {
    ensureManageWorkforce(actor);

    const request = await prisma.leaveRequest.findFirst({
      where: {
        id: input.leaveRequestId,
        orgId: actor.orgId,
        ...(actor.role === "MANAGER" && actor.storeId ? { storeId: actor.storeId } : {}),
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
    });
    if (!request) {
      throw new Error("Leave request not found");
    }
    if (request.status !== "PENDING") {
      throw new Error("Only pending leave requests can be rejected");
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewerComment: input.comment?.trim() || null,
        reviewedBy: actor.id,
        decidedAt: new Date(),
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
    });

    return toLeaveRecord(updated);
  },

  async cancel(actor: OrgAuthUser, input: LeaveDecisionInput): Promise<LeaveRecord> {
    const request = await prisma.leaveRequest.findFirst({
      where: {
        id: input.leaveRequestId,
        orgId: actor.orgId,
        userId: actor.id,
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
    });
    if (!request) {
      throw new Error("Leave request not found");
    }
    if (request.status !== "PENDING") {
      throw new Error("Only pending leave requests can be cancelled");
    }

    const comment = input.comment?.trim();
    const updated = await prisma.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewerComment: comment ? `Cancelled by requester: ${comment}` : "Cancelled by requester",
        reviewedBy: null,
        decidedAt: new Date(),
      },
      include: {
        user: { select: { name: true } },
        store: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
      },
    });

    return toLeaveRecord(updated);
  },
};