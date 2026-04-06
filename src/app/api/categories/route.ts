import { NextResponse } from "next/server";
import { categoryService } from "@/modules/categories/services/categoryService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const storeId = new URL(request.url).searchParams.get("storeId") ?? undefined;
    const categories = await categoryService.list(user.orgId, storeId);
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const body = await request.json();
    if (!body.name || !body.sizes || !Array.isArray(body.sizes)) {
      return NextResponse.json({ error: "name and sizes are required" }, { status: 400 });
    }
    const category = await categoryService.create(user.orgId, body);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("[categories POST]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
