import { requireOrgAuth } from "@/lib/auth.middleware";
import { getEffectiveCommercialAccess } from "@/modules/subscriptions/accessService";

/** Fresh, tenant-scoped state for navigation and billing recovery screens. */
export async function GET() {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const access = await getEffectiveCommercialAccess(user.orgId);
    return Response.json(access, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[subscription access] read failed", error);
    return Response.json({ error: "Subscription access temporarily unavailable" }, { status: 503 });
  }
}
