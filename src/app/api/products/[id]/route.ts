import { NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
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
    const product = await productService.getById(user.orgId, id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
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
    const product = await productService.update(user.orgId, id, body);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

  try {
    const { id } = await params;
    const deleted = await productService.delete(user.orgId, id);
    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
