import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// In-memory store for demo mode registrations (resets on server restart)
const demoRegisteredUsers: Array<{
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "ADMIN";
  storeId: string;
}> = [];

// Export for use in auth.ts demo credential check
export { demoRegisteredUsers };

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const emailLower = (email as string).toLowerCase().trim();

    // ── Demo mode: use in-memory store ────────────────────────────────────
    if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
      const exists = demoRegisteredUsers.some((u) => u.email === emailLower);
      if (exists) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user-${Date.now()}`,
        name: (name as string).trim(),
        email: emailLower,
        passwordHash,
        role: "ADMIN" as const,
        storeId: "test-store-001",
      };
      demoRegisteredUsers.push(newUser);

      return NextResponse.json({ success: true }, { status: 201 });
    }

    // ── Production mode: persist to database ──────────────────────────────
    const { prisma } = await import("@/lib/db");

    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name: (name as string).trim(),
        email: emailLower,
        passwordHash,
        role: "ADMIN",
        // NOTE: In a real multi-tenant app, create a new store here too.
        // For now, required storeId must be provided or a default store must exist.
        storeId: process.env.DEFAULT_STORE_ID ?? "default-store",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
