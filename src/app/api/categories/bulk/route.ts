import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { categoryService } from "@/modules/categories/services/categoryService";
import type { BulkCategoryValidated } from "@/modules/categories/types";

// Maximum rows accepted per request (server-side guard)
const MAX_ROWS = 500;

export const POST = async (request: Request) => {
  let user: { orgId: string };
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows: BulkCategoryValidated[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows } = body;

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
    if (!row.name || typeof row.name !== "string" || !row.name.trim()) {
      return NextResponse.json(
        { error: `Row ${i + 1}: name is required` },
        { status: 400 }
      );
    }
    if (!Array.isArray(row.sizes)) {
      return NextResponse.json(
        { error: `Row ${i + 1}: sizes must be an array` },
        { status: 400 }
      );
    }
    if (!row.attributeSchema || typeof row.attributeSchema !== "object") {
      return NextResponse.json(
        { error: `Row ${i + 1}: attributeSchema is required` },
        { status: 400 }
      );
    }
  }

  try {
    const result = await categoryService.bulkCreate(rows, user.orgId);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/categories/bulk]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
