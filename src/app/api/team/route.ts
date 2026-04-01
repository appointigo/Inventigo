import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";

// GET /api/team — list team members for current org
export const GET = async () => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
  } catch (err) {
    console.error("GET /api/team error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
