import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { brandService } from "@/modules/brands/services/brandService";
import type { BulkBrandValidated } from "@/modules/brands/types";

// Maximum rows accepted per request (server-side guard)
const MAX_ROWS = 1000;

export const POST = async (request: Request) => {
  let user: { orgId: string };
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows: BulkBrandValidated[] };
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
    if (typeof row.isActive !== "boolean") {
      return NextResponse.json(
        { error: `Row ${i + 1}: isActive must be a boolean` },
        { status: 400 }
      );
    }
  }

  try {
    const result = await brandService.bulkCreate(rows, user.orgId);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/brands/bulk]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
