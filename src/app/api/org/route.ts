import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";

// GET /api/org — return current org info
export const GET = async () => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: user.orgId },
      include: { _count: { select: { users: true, stores: true } } },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      isActive: org.isActive,
      userCount: org._count.users,
      storeCount: org._count.stores,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("GET /api/org error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// PATCH /api/org — update org name (OWNER only)
export const PATCH = async (req: NextRequest) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the organization owner can update settings" }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    await prisma.organization.update({
      where: { id: user.orgId },
      data: { name: name.trim() },
    });
    return NextResponse.json({ message: "Organization updated" });
  } catch (err) {
    console.error("PATCH /api/org error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
