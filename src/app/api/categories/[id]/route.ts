import { NextResponse } from "next/server";
import { categoryService } from "@/modules/categories/services/categoryService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const { id } = await params;
    const category = await categoryService.getById(user.orgId, id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const PUT = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const category = await categoryService.update(user.orgId, id, body);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } 
  catch (err) {
    console.error("[categories PUT]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  const { id } = await params;
  try {
    const deleted = await categoryService.delete(user.orgId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } 
  catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
