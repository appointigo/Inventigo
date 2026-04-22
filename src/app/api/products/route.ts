import { NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (request: Request) =>  {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      storeId: searchParams.get("storeId") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      brandId: searchParams.get("brandId") || undefined,
      search: searchParams.get("search") || undefined,
      isActive: searchParams.has("isActive") ? searchParams.get("isActive") === "true" : undefined,
    };
    console.log("[products GET] filters:", filters);
    const products = await productService.list(user.orgId, filters);
    return NextResponse.json(products);
  } 
  catch (err) {
    console.error("[products GET]", err);
    return NextResponse.json({ error: "Internal server error found" }, { status: 500 });
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
    if (!body.name || !body.sku || !body.categoryId || !body.brandId) {
      return NextResponse.json({ error: "name, sku, categoryId, and brandId are required" }, { status: 400 });
    }
    if (typeof body.mrp !== "number" || body.mrp <= 0) {
      return NextResponse.json({ error: "mrp must be a positive number" }, { status: 400 });
    }
    if (typeof body.basePrice !== "number" || body.basePrice <= 0) {
      return NextResponse.json({ error: "basePrice must be a positive number" }, { status: 400 });
    }
    if (typeof body.costPrice !== "number" || body.costPrice <= 0) {
      return NextResponse.json({ error: "costPrice must be a positive number" }, { status: 400 });
    }
    const product = await productService.create(user.orgId, body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[products POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
