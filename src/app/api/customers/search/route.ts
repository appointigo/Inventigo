import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim() ?? "";
    const phone = searchParams.get("phone")?.trim() ?? "";

    if (name && phone) {
      return NextResponse.json({ error: "Provide only one of name or phone" }, { status: 400 });
    }

    const hasName = name.length >= 2;
    const hasPhone = phone.length >= 3;

    const where = {
      orgId: user.orgId,
      ...(hasName
        ? { name: { startsWith: name, mode: "insensitive" as const } }
        : {}),
      ...(hasPhone
        ? { mobile: { startsWith: phone } }
        : {}),
    };

    const rows = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
      },
      orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
      take: hasName || hasPhone ? 6 : 20,
    });

    return NextResponse.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
