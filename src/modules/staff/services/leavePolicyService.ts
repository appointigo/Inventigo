import { prisma } from "@/lib/db";
import type { LeaveType, StoreLeavePolicyRecord, UpdateStoreLeavePolicyInput } from "../types";

export const DEFAULT_STORE_LEAVE_POLICY: Record<LeaveType, number> = {
  SICK: 12,
  CASUAL: 12,
  PAID: 18,
};

async function ensureStoreExists(orgId: string, storeId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId, isActive: true },
    select: { id: true, name: true },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  return store;
}

async function ensurePolicies(orgId: string, storeId: string) {
  await Promise.all(
    (Object.entries(DEFAULT_STORE_LEAVE_POLICY) as Array<[LeaveType, number]>).map(([leaveType, allocated]) =>
      prisma.storeLeavePolicy.upsert({
        where: { storeId_leaveType: { storeId, leaveType } },
        update: {},
        create: { orgId, storeId, leaveType, allocated },
      })
    )
  );
}

function toRecord(row: {
  storeId: string;
  leaveType: LeaveType;
  allocated: number;
  store: { name: string };
}): StoreLeavePolicyRecord {
  return {
    storeId: row.storeId,
    storeName: row.store.name,
    leaveType: row.leaveType,
    allocated: row.allocated,
  };
}

export const leavePolicyService = {
  async list(orgId: string, storeId: string): Promise<StoreLeavePolicyRecord[]> {
    await ensureStoreExists(orgId, storeId);
    await ensurePolicies(orgId, storeId);

    const policies = await prisma.storeLeavePolicy.findMany({
      where: { orgId, storeId },
      include: { store: { select: { name: true } } },
      orderBy: { leaveType: "asc" },
    });

    return policies.map(toRecord);
  },

  async getPolicyMap(orgId: string, storeId: string): Promise<Map<LeaveType, number>> {
    await ensurePolicies(orgId, storeId);
    const policies = await prisma.storeLeavePolicy.findMany({
      where: { orgId, storeId },
      select: { leaveType: true, allocated: true },
    });

    return new Map(policies.map((policy) => [policy.leaveType, policy.allocated]));
  },

  async set(orgId: string, storeId: string, input: UpdateStoreLeavePolicyInput[]): Promise<StoreLeavePolicyRecord[]> {
    await ensureStoreExists(orgId, storeId);

    const normalized = (Object.entries(DEFAULT_STORE_LEAVE_POLICY) as Array<[LeaveType, number]>).map(([leaveType, fallback]) => {
      const item = input.find((entry) => entry.leaveType === leaveType);
      const allocated = item?.allocated ?? fallback;
      if (!Number.isInteger(allocated) || allocated < 0) {
        throw new Error(`Invalid allocation for ${leaveType}`);
      }
      return { leaveType, allocated };
    });

    const users = await prisma.user.findMany({
      where: { orgId, storeId, isActive: true },
      select: { id: true },
    });
    const year = new Date().getUTCFullYear();

    await prisma.$transaction([
      ...normalized.map((policy) =>
        prisma.storeLeavePolicy.upsert({
          where: { storeId_leaveType: { storeId, leaveType: policy.leaveType } },
          update: { allocated: policy.allocated },
          create: { orgId, storeId, leaveType: policy.leaveType, allocated: policy.allocated },
        })
      ),
      ...users.flatMap((user) =>
        normalized.map((policy) =>
          prisma.leaveBalance.upsert({
            where: {
              userId_leaveType_year: {
                userId: user.id,
                leaveType: policy.leaveType,
                year,
              },
            },
            update: { allocated: policy.allocated },
            create: {
              orgId,
              userId: user.id,
              leaveType: policy.leaveType,
              year,
              allocated: policy.allocated,
            },
          })
        )
      ),
    ]);

    return this.list(orgId, storeId);
  },
};