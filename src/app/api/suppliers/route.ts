import { NextResponse } from "next/server";
import { supplierService } from "@/modules/suppliers/services/supplierService";

export async function GET() {
  try {
    const suppliers = await supplierService.list();
    return NextResponse.json(suppliers);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const supplier = await supplierService.create(body);
    return NextResponse.json(supplier, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
