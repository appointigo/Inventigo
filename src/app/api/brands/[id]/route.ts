import { NextResponse } from "next/server";
import { brandService } from "@/modules/brands/services/brandService";
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
    const brand = await brandService.getById(user.orgId, id);
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json(brand);
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
    const brand = await brandService.update(user.orgId, id, body);
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json(brand);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) =>  {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  const { id } = await params;
  try {
    const deleted = await brandService.delete(user.orgId, id);
    if (!deleted) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } 
  catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
