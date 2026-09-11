import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { buildWhatsAppConnectionStatus } from "@/modules/whatsapp/connectionStatus";

export async function GET() {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { organizationId: user.orgId, provider: "META" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        credentialRef: true,
        connectedAt: true,
        lastSyncedAt: true,
        businessAccounts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, metaWabaId: true, businessName: true, status: true,
            currency: true, timezone: true, lastSyncedAt: true,
            phoneNumbers: { orderBy: { createdAt: "asc" }, select: {
              id: true, metaPhoneNumberId: true, displayPhoneNumber: true,
              verifiedName: true, qualityRating: true, status: true, lastSyncedAt: true,
            } },
          },
        },
      },
    });

    return NextResponse.json(buildWhatsAppConnectionStatus(integration));
  } catch {
    return NextResponse.json({ error: "Unable to load WhatsApp status" }, { status: 500 });
  }
}
