import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// GET /api/invitations/[token] — validate and fetch invite info (public, no auth)
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;

  try {
    const inv = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });

    if (!inv) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (inv.status !== "PENDING") {
      return NextResponse.json({ error: "Invitation has already been used or expired" }, { status: 410 });
    }
    if (inv.expiresAt < new Date()) {
      await prisma.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    return NextResponse.json({
      email: inv.email,
      orgName: inv.org.name,
      role: inv.role,
      inviterName: inv.inviter.name,
    });
  } catch (err) {
    console.error("GET /api/invitations/[token] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// POST /api/invitations/[token] — accept invitation, create user account
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;

  let body: { name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, password } = body;
  if (!name || !password) {
    return NextResponse.json({ error: "name and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.invitation.findUnique({
        where: { token },
        include: { org: { select: { id: true } } },
      });

      if (!inv || inv.status !== "PENDING") throw new Error("INVALID_INVITATION");
      if (inv.expiresAt < new Date()) {
        await tx.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
        throw new Error("EXPIRED_INVITATION");
      }

      const existingUser = await tx.user.findUnique({ where: { email: inv.email } });
      if (existingUser) throw new Error("EMAIL_EXISTS");

      const user = await tx.user.create({
        data: { name, email: inv.email, passwordHash, role: inv.role, orgId: inv.orgId, storeId: null },
      });

      await tx.invitation.update({ where: { token }, data: { status: "ACCEPTED" } });

      return user;
    });

    return NextResponse.json({ message: "Invitation accepted", userId: result.id });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVALID_INVITATION") {
        return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 410 });
      }
      if (err.message === "EXPIRED_INVITATION") {
        return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
      }
      if (err.message === "EMAIL_EXISTS") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
    }
    console.error("POST /api/invitations/[token] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

// DELETE /api/invitations/[token] — revoke invitation by ID
export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token: invitationId } = await params;

  try {
    const inv = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!inv) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.invitation.delete({ where: { id: invitationId } });
    return NextResponse.json({ message: "Invitation revoked" });
  } catch (err) {
    console.error("DELETE /api/invitations/[token] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
