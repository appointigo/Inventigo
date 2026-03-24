import { NextResponse } from "next/server";
import { categoryService } from "@/modules/categories/services/categoryService";

export async function GET() {
  try {
    const categories = await categoryService.list();
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.sizes || !Array.isArray(body.sizes)) {
      return NextResponse.json({ error: "name and sizes are required" }, { status: 400 });
    }
    const category = await categoryService.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
