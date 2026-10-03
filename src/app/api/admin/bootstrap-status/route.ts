import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { DatabaseConfigurationError, prisma } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/admin/bootstrap-status
// Returns whether the one-time super admin bootstrap is still available.
export const GET = async () => {
  try {
    const count = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
    return NextResponse.json({ bootstrapAvailable: count === 0 });
  } catch (err) {
    console.error("[bootstrap-status]", err);
    if (err instanceof DatabaseConfigurationError) {
      return NextResponse.json(
        { error: "Database is not configured", code: err.code },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
