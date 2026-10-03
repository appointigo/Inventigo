import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const customer = await prisma.customer.findFirst({ where: { id, orgId: user.orgId }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  return NextResponse.json(await prisma.customerVisit.findMany({ where: { orgId: user.orgId, customerId: id, ...(user.storeId ? { storeId: user.storeId } : {}) }, include: { store: { select: { id: true, name: true } }, demandRequests: { include: { category: { select: { name: true } }, brand: { select: { name: true } }, product: { select: { name: true } }, followUps: { select: { id: true, status: true } } } } }, orderBy: { visitedAt: "desc" } }));
}
