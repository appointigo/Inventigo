import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { productService } from "@/modules/products/services/productService";
import type { BulkProductValidated } from "@/modules/products/types";

// Maximum rows accepted per request (server-side guard)
const MAX_ROWS = 500;

export const POST = async (request: Request) => {
  let user: { orgId: string };
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows: BulkProductValidated[]; storeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows, storeId } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "rows must be a non-empty array" },
      { status: 400 }
    );
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Batch too large. Maximum ${MAX_ROWS} rows per request.` },
      { status: 400 }
    );
  }

  // Basic shape validation — defend against malformed client payloads
  for (const [i, row] of rows.entries()) {
    const rowNum = i + 1;
    if (!row.name || typeof row.name !== "string" || !row.name.trim()) {
      return NextResponse.json(
        { error: `Row ${rowNum}: name is required` },
        { status: 400 }
      );
    }
    if (!row.brandName || typeof row.brandName !== "string" || !row.brandName.trim()) {
      return NextResponse.json(
        { error: `Row ${rowNum}: brandName is required` },
        { status: 400 }
      );
    }
    if (!row.categoryName || typeof row.categoryName !== "string" || !row.categoryName.trim()) {
      return NextResponse.json(
        { error: `Row ${rowNum}: categoryName is required` },
        { status: 400 }
      );
    }
    if (typeof row.basePrice !== "number" || row.basePrice <= 0) {
      return NextResponse.json(
        { error: `Row ${rowNum}: basePrice must be a positive number` },
        { status: 400 }
      );
    }
    if (typeof row.costPrice !== "number" || row.costPrice <= 0) {
      return NextResponse.json(
        { error: `Row ${rowNum}: costPrice must be a positive number` },
        { status: 400 }
      );
    }
    if (typeof row.sizesAndQuantities !== "object" || row.sizesAndQuantities === null) {
      return NextResponse.json(
        { error: `Row ${rowNum}: sizesAndQuantities must be an object` },
        { status: 400 }
      );
    }
  }

  try {
    const result = await productService.bulkCreate(rows, user.orgId, storeId);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/products/bulk]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
