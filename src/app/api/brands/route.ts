import { NextResponse } from "next/server";
import { brandService } from "@/modules/brands/services/brandService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async () => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const brands = await brandService.list(user.orgId);
    return NextResponse.json(brands);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const brand = await brandService.create(user.orgId, body);
    return NextResponse.json(brand, { status: 201 });
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
