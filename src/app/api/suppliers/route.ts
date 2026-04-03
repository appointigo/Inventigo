import { NextResponse } from "next/server";
import { supplierService } from "@/modules/suppliers/services/supplierService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET() {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const suppliers = await supplierService.list(user.orgId);
    return NextResponse.json(suppliers);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const supplier = await supplierService.create(user.orgId, body);
    return NextResponse.json(supplier, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
