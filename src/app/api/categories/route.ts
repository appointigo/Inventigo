import { NextResponse } from "next/server";
import { categoryService } from "@/modules/categories/services/categoryService";

export async function GET() {
  const categories = await categoryService.list();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name || !body.sizes || !Array.isArray(body.sizes)) {
    return NextResponse.json({ error: "name and sizes are required" }, { status: 400 });
  }

  const category = await categoryService.create(body);
  return NextResponse.json(category, { status: 201 });
}
