import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { userService } from "@/modules/settings/services/userService";
import { requireOrgAuth } from "@/lib/auth.middleware";

function canManageUsers(role: Role): boolean {
  return role === Role.OWNER || role === Role.ADMIN;
}

export async function GET() {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await userService.list(user.orgId);
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.name || !body.email || !body.password || !body.role) {
    return NextResponse.json(
      { error: "name, email, password, and role are required" },
      { status: 400 }
    );
  }
  try {
    const createdUser = await userService.create(user.orgId, body);
    return NextResponse.json(createdUser, { status: 201 });
  } catch (err) {
    console.error("[users POST]", err);
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
