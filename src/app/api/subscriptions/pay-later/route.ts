import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { getEffectiveCommercialAccess } from "@/modules/subscriptions/accessService";

export async function POST() {
  let actor;
  try {
    actor = await requireOrgAuth({ allowPendingSubscription: true });
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { orgId: true, role: true, emailVerified: true },
  });
  if (!user?.emailVerified || user.role !== "OWNER" || user.orgId !== actor.orgId) {
    return Response.json({ error: "Only the workspace owner can leave checkout" }, { status: 403 });
  }
  try {
    const access = await getEffectiveCommercialAccess(actor.orgId);
    if (access.source !== "NONE") {
      return Response.json({ error: "This workspace already has an active plan" }, { status: 409 });
    }
    await prisma.organization.update({
      where: { id: actor.orgId },
      data: { saasBillingRequired: true },
    });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[subscription pay later] failed", error);
    return Response.json({ error: "Could not save your checkout choice" }, { status: 503 });
  }
}
