import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { canAssignRole, canManageUsers, requiresStoreAssignment } from "@/lib/rbac";

const generateToken = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// GET /api/invitations — list invitations for current org (ADMIN/OWNER only)
export const GET = async () => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invitations = await prisma.invitation.findMany({
      where: { orgId: user.orgId },
      include: {
        inviter: { select: { name: true } },
        store: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        storeId: i.storeId ?? null,
        storeName: i.store?.name ?? null,
        status: i.status,
        inviterName: i.inviter.name,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("GET /api/invitations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// POST /api/invitations — create/send invitation (ADMIN/OWNER only)
export const POST = async (req: NextRequest) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; role?: string; storeId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, role, storeId } = body;
  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  const validRoles: Role[] = ["ADMIN", "MANAGER", "STAFF"];

  if (!validRoles.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!canAssignRole(user.role, role as Role)) {
    return NextResponse.json({ error: "You are not allowed to invite that role" }, { status: 403 });
  }

  if (requiresStoreAssignment(role as Role) && !storeId) {
    return NextResponse.json({ error: "A store is required for Manager and Staff invitations" }, { status: 400 });
  }

  const inviteToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingUser?.orgId === user.orgId) {
      return NextResponse.json({ error: "This user is already a member of your organization" }, { status: 409 });
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: { email: emailLower, orgId: user.orgId, status: "PENDING" },
    });
    if (existingInvite) {
      return NextResponse.json({ error: "An invitation for this email is already pending" }, { status: 409 });
    }

    if (storeId) {
      const store = await prisma.store.findFirst({
        where: { id: storeId, orgId: user.orgId, isActive: true },
        select: { id: true },
      });
      if (!store) {
        return NextResponse.json({ error: "Assigned store not found" }, { status: 400 });
      }
    }

    const invitation = await prisma.invitation.create({
      data: {
        orgId: user.orgId,
        storeId: storeId ?? null,
        email: emailLower,
        role: role as Role,
        invitedBy: user.id,
        token: inviteToken,
        expiresAt,
      },
    });

    console.log(`[INFO] Invitation created for ${emailLower}: /invite/${inviteToken}`);

    return NextResponse.json(
      { message: "Invitation sent", inviteLink: `/invite/${invitation.token}` },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/invitations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
