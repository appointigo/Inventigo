import { NextResponse } from "next/server";
import { categoryService } from "@/modules/categories/services/categoryService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async () => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const categories = await categoryService.list(user.orgId);
    return NextResponse.json(categories);
  } catch {
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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
