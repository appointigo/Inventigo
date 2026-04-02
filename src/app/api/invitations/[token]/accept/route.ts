import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
// POST /api/invitations/[token]/accept
// Authenticated route: existing signed-in user accepts an invitation to join an org.
export const POST = async (
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;

  // ─── Auth check ──────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, email: sessionEmail, orgId: currentOrgId } = session.user as {
    id: string;
    email: string;
    orgId: string | null;
    emailVerified: boolean;
  };

  if (currentOrgId) {
    return NextResponse.json(
      { error: "You already belong to an organization." },
      { status: 409 }
    );
  }

  try {
    const { prisma } = await import("@/lib/db");

    const inv = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: {
          select: {
            name: true,
            stores: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
          },
        },
      },
    });

    if (!inv) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (inv.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation has already been used or expired" },
        { status: 410 }
      );
    }
    if (inv.expiresAt < new Date()) {
      await prisma.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }
    if (inv.email.toLowerCase() !== sessionEmail?.toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation was sent to ${inv.email}.` },
        { status: 403 }
      );
    }

    const firstStoreId = inv.org.stores[0]?.id ?? null;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          orgId: inv.orgId,
          storeId: firstStoreId,
          role: inv.role,
        },
      }),
      prisma.invitation.update({
        where: { token },
        data: { status: "ACCEPTED" },
      }),
    ]);

    return NextResponse.json({
      message: `You have joined ${inv.org.name} as ${inv.role}`,
      orgId: inv.orgId,
      role: inv.role,
    });
  } 
  catch (err) {
    console.error("POST /api/invitations/[token]/accept error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
