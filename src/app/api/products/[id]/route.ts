import { NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";

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
    const requestedStoreId = new URL(_request.url).searchParams.get("storeId");
    const scope = requestedStoreId || user.storeId
      ? await resolveAnalyticsStore(user, requestedStoreId)
      : null;
    const product = await productService.getById(user.orgId, id, scope?.storeId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } 
  catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    const scope = body.sizes !== undefined
      ? await resolveAnalyticsStore(user, body.storeId ?? null)
      : null;
    const product = await productService.update(
      user.orgId, id, { ...body, storeId: scope?.storeId ?? body.storeId }, user.id,
    );
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } 
  catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
