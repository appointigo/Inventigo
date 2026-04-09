import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

// GET /api/admin/bootstrap-status
// Returns whether the one-time super admin bootstrap is still available.
export const GET = async () => {
  try {
    const count = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
    return NextResponse.json({ bootstrapAvailable: count === 0 });
  } catch (err) {
    console.error("[bootstrap-status]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
