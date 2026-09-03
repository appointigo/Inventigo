import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  createWhatsAppCampaignControlService,
  createWhatsAppCampaignMetricsService,
} from "@/modules/whatsapp/server";

const actionSchema = z.object({ action: z.enum(["LAUNCH", "PAUSE", "RESUME", "CANCEL"]) });
type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await createWhatsAppCampaignMetricsService().get(user.orgId, (await context.params).id)
    );
  } catch {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
}

export async function POST(request: Request, context: Context) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN", "MANAGER"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid campaign action" }, { status: 400 });
  const service = createWhatsAppCampaignControlService();
  const id = (await context.params).id;
  try {
    const result =
      parsed.data.action === "LAUNCH"
        ? await service.launch(user.orgId, id)
        : parsed.data.action === "PAUSE"
          ? await service.pause(user.orgId, id)
          : parsed.data.action === "RESUME"
            ? await service.resume(user.orgId, id)
            : await service.cancel(user.orgId, id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campaign action failed" },
      { status: 409 }
    );
  }
}
