import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store for demo/development mode registrations.
// Exported so auth.ts can look up demo users during sign-in.
// ─────────────────────────────────────────────────────────────────────────────
export interface DemoRegisteredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "OWNER";
  storeId: string | null;
  orgId: string;
}

// In-memory store for demo mode registrations (resets on server restart)
export const demoRegisteredUsers: DemoRegisteredUser[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { orgName, ownerName, email, password }
// Creates: Organization + OWNER User + default Store (in one transaction)
// ─────────────────────────────────────────────────────────────────────────────
export const POST = async (req: NextRequest) => {
  let body: { orgName?: string; ownerName?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } 
  catch (error){
    console.error(error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orgName, ownerName, email, password } = body;

  if (!orgName || !ownerName || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const emailLower = email.toLowerCase().trim();
  const baseSlug = slugify(orgName);
  const passwordHash = await bcrypt.hash(password, 12);

  // ── Demo / development mode ─────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
    const existingUser = demoRegisteredUsers.find((u) => u.email === emailLower);
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const orgId = `demo-org-${Date.now()}`;
    const userId = `demo-user-${Date.now()}`;

    demoRegisteredUsers.push({
      id: userId,
      name: ownerName,
      email: emailLower,
      passwordHash,
      role: "OWNER",
      storeId: null,
      orgId,
    });

    return NextResponse.json(
      { message: "Organization registered successfully", orgId, userId },
      { status: 201 }
    );
  }

  // ── Production mode — DB transaction ────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");

    const result = await prisma.$transaction(async (tx) => {
      // Check email uniqueness
      const existingUser = await tx.user.findUnique({ where: { email: emailLower } });
      if (existingUser) {
        throw new Error("EMAIL_EXISTS");
      }

      // Ensure slug is unique — append timestamp suffix if taken
      let finalSlug = baseSlug;
      const existingOrg = await tx.organization.findUnique({ where: { slug: baseSlug } });
      if (existingOrg) {
        finalSlug = `${baseSlug}-${Date.now()}`;
      }

      // Create organization
      const org = await tx.organization.create({
        data: { name: orgName, slug: finalSlug },
      });

      // Create OWNER user
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email: emailLower,
          passwordHash,
          role: "OWNER",
          orgId: org.id,
          storeId: null,
        },
      });

      // Create default store
      await tx.store.create({
        data: {
          orgId: org.id,
          name: "Main Store",
          code: "MAIN",
        },
      });

      return { orgId: org.id, userId: user.id };
    });

    return NextResponse.json(
      { message: "Organization registered successfully", ...result },
      { status: 201 }
    );
  } 
  catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
