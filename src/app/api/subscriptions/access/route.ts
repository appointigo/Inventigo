import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { getEffectiveCommercialAccess } from "@/modules/subscriptions/accessService";

/** Fresh, tenant-scoped state for navigation and billing recovery screens. */
export async function GET() {
  let user;
  try {
    user = await requireOrgAuth({ allowPendingSubscription: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [access, organization] = await Promise.all([
      getEffectiveCommercialAccess(user.orgId),
      prisma.organization.findUnique({
        where: { id: user.orgId },
        select: { saasBillingRequired: true },
      }),
    ]);
    if (!organization) return Response.json({ error: "Workspace not found" }, { status: 404 });
    return Response.json({ ...access, billingRequired: organization.saasBillingRequired }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[subscription access] read failed", error);
    return Response.json({ error: "Subscription access temporarily unavailable" }, { status: 503 });
  }
}
