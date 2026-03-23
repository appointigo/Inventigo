import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { userService } from "@/modules/settings/services/userService";
import { requireRole } from "@/lib/auth.middleware";

export async function GET() {
  try {
    await requireRole(Role.ADMIN);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
  const users = await userService.list();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    await requireRole(Role.ADMIN);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
  const body = await request.json();
  if (!body.name || !body.email || !body.password || !body.role) {
    return NextResponse.json(
      { error: "name, email, password, and role are required" },
      { status: 400 }
    );
  }
  try {
    const user = await userService.create(body);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
