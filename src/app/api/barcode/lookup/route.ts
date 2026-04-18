import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { sanitizeScannedBarcode } from "@/shared/services/barcodeService";
import type { BarcodeLookupResult } from "@/modules/barcode/types";

export const GET = async (request: NextRequest) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const rawSku = request.nextUrl.searchParams.get("sku");

    if (!rawSku) {
      return NextResponse.json({ error: "sku query parameter is required" }, { status: 400 });
    }

    // ─── Sanitize Input ──────────────────────────────────────────────────────
    // Trim whitespace, remove scanner artifacts, validate format
    const sku = sanitizeScannedBarcode(rawSku);
    if (!sku) {
      return NextResponse.json({ error: "Invalid barcode format" }, { status: 400 });
    }

    // ─── Tier 1: Try product SKU or external barcode (case-insensitive) ────
    let product = await productService.getByBarcode(user.orgId, sku);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // ─── Extract matched variant (if scanning a size-specific barcode) ──────
    const scannedUpper = sku.toUpperCase();
    const matchedVariant = product.stock.find(
      (s) => s.variantSku?.toUpperCase() === scannedUpper
    )?.sizeLabel ?? null;

    const result: BarcodeLookupResult = {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        externalBarcode: product.externalBarcode,
        categoryName: product.categoryName,
        brandName: product.brandName,
        basePrice: product.basePrice,
        imageUrl: product.imageUrl,
      },
      stockLevels: product.stock.map((s) => ({
        sizeLabel: s.sizeLabel,
        variantSku: s.variantSku ?? null,
        quantity: s.quantity,
        status: s.quantity === 0 ? "OUT" : s.quantity <= s.reorderLevel ? "LOW" : "OK",
      })),
      matchedVariant,
    };

    return NextResponse.json(result);
  } 
  catch (error) {
    console.error("[barcode/lookup] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
