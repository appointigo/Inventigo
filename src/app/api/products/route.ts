import { NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    categoryId: searchParams.get("categoryId") || undefined,
    brandId: searchParams.get("brandId") || undefined,
    search: searchParams.get("search") || undefined,
    isActive: searchParams.has("isActive") ? searchParams.get("isActive") === "true" : undefined,
  };
  const products = await productService.list(filters);
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name || !body.sku || !body.categoryId || !body.brandId) {
    return NextResponse.json({ error: "name, sku, categoryId, and brandId are required" }, { status: 400 });
  }
  const product = await productService.create(body);
  return NextResponse.json(product, { status: 201 });
}
