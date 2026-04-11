import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/register-business
// Auth: Required — must have a valid session with emailVerified=true, orgId=null
// Body: { businessName, industry?, storeName?, storeCity?, plan }
// Creates the Organization + Store and links the user to them.
// After success, the client calls session.update() to refresh the JWT.
// ─────────────────────────────────────────────────────────────────────────────

interface RegisterBusinessBody {
  businessName: string;
  industry?: string;
  storeName?: string;
  storeCity?: string;
  plan?: "FREE" | "PRO" | "ENTERPRISE";
}

const slugify = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POST = async (request: NextRequest) => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Email verification required before registering a business" },
      { status: 403 }
    );
  }

  if (session.user.orgId) {
    return NextResponse.json(
      { error: "You are already part of an organization" },
      { status: 409 }
    );
  }

  let body: RegisterBusinessBody;
  try {
    body = (await request.json()) as RegisterBusinessBody;
  } 
  catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { businessName, industry, storeName, storeCity, plan = "FREE" } = body;

  if (!businessName?.trim()) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  if (!["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan. Must be FREE, PRO, or ENTERPRISE" }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    const { prisma } = await import("@/lib/db");

    // Ensure the user still has no org (guard against race conditions)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { orgId: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: "Email verification required" }, { status: 403 });
    }
    if (user.orgId) {
      return NextResponse.json({ error: "Already part of an organization" }, { status: 409 });
    }

    const baseSlug = slugify(businessName.trim());

    const result = await prisma.$transaction(async (tx) => {
      // Ensure slug uniqueness
      let finalSlug = baseSlug;
      const existingOrg = await tx.organization.findUnique({ where: { slug: baseSlug } });
      if (existingOrg) {
        finalSlug = `${baseSlug}-${Date.now()}`;
      }

      const org = await tx.organization.create({
        data: {
          name: businessName.trim(),
          slug: finalSlug,
          plan: plan as "FREE" | "PRO" | "ENTERPRISE",
        },
      });

      const store = await tx.store.create({
        data: {
          orgId: org.id,
          name: storeName?.trim() || "Main Store",
          code: "MAIN",
          address: storeCity?.trim() || null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          orgId: org.id,
          storeId: store.id,
          role: "OWNER",
        },
      });

      // Seed default expense categories for the new org
      await tx.expenseCategoryOption.createMany({
        data: [
          { orgId: org.id, name: "Rent", colorKey: "blue" },
          { orgId: org.id, name: "Electricity", colorKey: "gold" },
          { orgId: org.id, name: "Employee Salary", colorKey: "green" },
          { orgId: org.id, name: "Cleaning", colorKey: "cyan" },
          { orgId: org.id, name: "Miscellaneous", colorKey: "default" },
          { orgId: org.id, name: "Stationery", colorKey: "purple" },
        ],
        skipDuplicates: true,
      });

      return { orgId: org.id, storeId: store.id };
    });

    return NextResponse.json(
      { message: "Business registered successfully", ...result },
      { status: 201 }
    );
  } 
  catch (error) {
    console.error("Register business error:", error);
    return NextResponse.json({ error: "Failed to register business" }, { status: 500 });
  }
}
