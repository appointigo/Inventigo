import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";

// GET /api/team — list team members for current org
export const GET = async () => {
  let user;
  try {
    user = await requireOrgAuth();
  } 
  catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
    return NextResponse.json([
      {
        id: "test-owner-001",
        name: "Test Owner",
        email: "owner@stockiva.com",
        role: "OWNER",
        storeId: null,
        storeName: null,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "test-admin-001",
        name: "Test Admin",
        email: "admin@stockiva.com",
        role: "ADMIN",
        storeId: "test-store-001",
        storeName: "Main Store",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "test-staff-001",
        name: "Test Staff",
        email: "staff@stockiva.com",
        role: "STAFF",
        storeId: "test-store-001",
        storeName: "Main Store",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  try {
    const { prisma } = await import("@/lib/db");

    const members = await prisma.user.findMany({
      where: { orgId: user.orgId },
      include: { store: { select: { name: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        storeId: m.storeId,
        storeName: m.store?.name ?? null,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } 
  catch (err) {
    console.error("GET /api/team error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
