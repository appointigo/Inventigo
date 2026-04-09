import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/create-super-admin
//
// One-time bootstrap endpoint — creates the first SUPER_ADMIN user.
// Automatically disabled once any SUPER_ADMIN exists in the database.
// No secret header required — the zero-count check is the guard.
// ─────────────────────────────────────────────────────────────────────────────

export const POST = async (request: NextRequest) => {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    // One-time bootstrap guard: reject if any SUPER_ADMIN already exists
    const superAdminCount = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN },
    });
    if (superAdminCount > 0) {
      return NextResponse.json(
        { error: "Super admin already exists. Bootstrap is disabled." },
        { status: 409 }
      );
    }

    // Check if email is already registered under a different role
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: Role.SUPER_ADMIN,
        orgId: null,
        storeId: null,
        emailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ message: "Super admin created", user }, { status: 201 });
  } catch (err) {
    console.error("[create-super-admin]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
