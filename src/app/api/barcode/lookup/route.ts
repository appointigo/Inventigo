import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
import type { BarcodeLookupResult } from "@/modules/barcode/types";

export async function GET(request: NextRequest) {
  const sku = request.nextUrl.searchParams.get("sku");

  if (!sku || !sku.trim()) {
    return NextResponse.json({ error: "sku query parameter is required" }, { status: 400 });
  }

  const product = await productService.getBySku(sku.trim());

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const result: BarcodeLookupResult = {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryName: product.categoryName,
      brandName: product.brandName,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
    },
    stockLevels: product.stock.map((s) => ({
      sizeLabel: s.sizeLabel,
      quantity: s.quantity,
      status: s.quantity === 0 ? "OUT" : s.quantity <= s.reorderLevel ? "LOW" : "OK",
    })),
  };

  return NextResponse.json(result);
}
