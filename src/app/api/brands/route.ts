import { NextResponse } from "next/server";
import { brandService } from "@/modules/brands/services/brandService";

export async function GET() {
  const brands = await brandService.list();
  return NextResponse.json(brands);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const brand = await brandService.create(body);
  return NextResponse.json(brand, { status: 201 });
}
