import { NextResponse } from "next/server";
import { brandService } from "@/modules/brands/services/brandService";

export async function GET() {
  try {
    const brands = await brandService.list();
    return NextResponse.json(brands);
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
    const brand = await brandService.create(body);
    return NextResponse.json(brand, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
