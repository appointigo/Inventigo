import { NextResponse } from "next/server";
import { expenseCategoryService } from "@/modules/expenses/services/expenseCategoryService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET() {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let categories = await expenseCategoryService.list(user.orgId);
    if (categories.length === 0) {
      await expenseCategoryService.seedDefaults(user.orgId);
      categories = await expenseCategoryService.list(user.orgId);
    }
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[expenses/categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN / MANAGER / OWNER can manage categories
  if (!["OWNER", "ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const category = await expenseCategoryService.create(
      user.orgId,
      name,
      body.colorKey ?? "default"
    );
    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint (duplicate name)
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }
    console.error("[expenses/categories POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
