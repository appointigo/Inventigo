import "server-only";
import { prisma } from "@/lib/db";
import type { CustomerFollowUpPriority, CustomerFollowUpStatus, CustomerFollowUpType } from "@prisma/client";

type FollowUpInput = {
  customerId: string;
  storeId?: string;
  assignedUserId?: string | null;
  visitId?: string | null;
  demandRequestId?: string | null;
  type: CustomerFollowUpType;
  status?: CustomerFollowUpStatus;
  priority?: CustomerFollowUpPriority;
  title: string;
  description?: string | null;
  reason?: string | null;
  note?: string | null;
  dueAt?: string | null;
  dedupeKey?: string | null;
};

async function resolveScope(orgId: string, userStoreId: string | null, customerId: string, requestedStoreId?: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, orgId }, select: { id: true, preferredStoreId: true } });
  if (!customer) throw new Error("Customer not found");
  const storeId = requestedStoreId ?? customer.preferredStoreId ?? userStoreId;
  if (!storeId) throw new Error("A follow-up store is required");
  if (userStoreId && userStoreId !== storeId) throw new Error("Store access denied");
  const store = await prisma.store.findFirst({ where: { id: storeId, orgId, isActive: true }, select: { id: true } });
  if (!store) throw new Error("Store access denied");
  return storeId;
}

async function validateLinks(orgId: string, customerId: string, storeId: string, visitId?: string | null, demandRequestId?: string | null) {
  const visit = visitId ? await prisma.customerVisit.findFirst({ where: { id: visitId, orgId, customerId }, select: { id: true, storeId: true } }) : null;
  if (visitId && !visit) throw new Error("Related visit does not belong to this customer");
  const demand = demandRequestId ? await prisma.demandRequest.findFirst({ where: { id: demandRequestId, orgId, visit: { customerId } }, select: { id: true, visitId: true, storeId: true } }) : null;
  if (demandRequestId && !demand) throw new Error("Related demand request does not belong to this customer");
  if (visit && demand && demand.visitId !== visit.id) throw new Error("Related demand request does not belong to the selected visit");
  if ((visit && visit.storeId !== storeId) || (demand && demand.storeId !== storeId)) throw new Error("Related records belong to another store");
}

export const customerFollowUpService = {
  async list(orgId: string, userStoreId: string | null, filters: { customerId?: string; status?: CustomerFollowUpStatus }) {
    return prisma.customerFollowUp.findMany({
      where: { orgId, ...(userStoreId ? { storeId: userStoreId } : {}), ...(filters.customerId ? { customerId: filters.customerId } : {}), ...(filters.status ? { status: filters.status } : {}) },
      include: { customer: { select: { id: true, name: true, mobile: true } }, store: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } }, visit: { select: { id: true, visitedAt: true } }, demandRequest: { select: { id: true, reasonCode: true } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  },
  async get(orgId: string, userStoreId: string | null, id: string) {
    const item = await prisma.customerFollowUp.findFirst({ where: { id, orgId, ...(userStoreId ? { storeId: userStoreId } : {}) }, include: { customer: true, store: true, assignee: { select: { id: true, name: true } }, visit: true, demandRequest: true } });
    if (!item) throw new Error("Follow-up not found");
    return item;
  },
  async create(orgId: string, userId: string, userStoreId: string | null, input: FollowUpInput) {
    const storeId = await resolveScope(orgId, userStoreId, input.customerId, input.storeId);
    if (input.assignedUserId) {
      const assignee = await prisma.user.findFirst({ where: { id: input.assignedUserId, orgId, isActive: true, OR: [{ storeId }, { storeId: null }] }, select: { id: true } });
      if (!assignee) throw new Error("Invalid follow-up assignee");
    }
    await validateLinks(orgId, input.customerId, storeId, input.visitId, input.demandRequestId);
    return prisma.customerFollowUp.create({ data: { orgId, customerId: input.customerId, storeId, createdBy: userId, assignedUserId: input.assignedUserId, visitId: input.visitId, demandRequestId: input.demandRequestId, type: input.type, status: input.status ?? "OPEN", priority: input.priority ?? "NORMAL", title: input.title.trim(), description: input.description?.trim() || null, reason: input.reason?.trim() || null, note: input.note?.trim() || null, dueAt: input.dueAt ? new Date(input.dueAt) : null, dedupeKey: input.dedupeKey || null } });
  },
  async update(orgId: string, userStoreId: string | null, id: string, input: { status?: CustomerFollowUpStatus; priority?: CustomerFollowUpPriority; assignedUserId?: string | null; dueAt?: string | null; title?: string; description?: string | null; note?: string | null }) {
    const existing = await prisma.customerFollowUp.findFirst({ where: { id, orgId, ...(userStoreId ? { storeId: userStoreId } : {}) } });
    if (!existing) throw new Error("Follow-up not found");
    if (input.assignedUserId) {
      const assignee = await prisma.user.findFirst({ where: { id: input.assignedUserId, orgId, isActive: true, OR: [{ storeId: existing.storeId }, { storeId: null }] }, select: { id: true } });
      if (!assignee) throw new Error("Invalid follow-up assignee");
    }
    return prisma.customerFollowUp.update({ where: { id }, data: { ...input, dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null, completedAt: input.status === "COMPLETED" ? new Date() : input.status ? null : undefined } });
  },
};
