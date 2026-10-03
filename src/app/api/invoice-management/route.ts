import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { invoiceManagementSettingsUpdateSchema } from "@/modules/invoice-management/schemas";
import { InvoiceManagementService, InvoiceManagementValidationError } from "@/modules/invoice-management/services/invoiceManagementService";
import { createWhatsAppInvoiceTemplateService } from "@/modules/whatsapp/server";

export const runtime = "nodejs";

const canManage = (role: string) => role === "OWNER" || role === "ADMIN";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const storeId = new URL(request.url).searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "Store is required" }, { status: 400 });
  try {
    const [settings, templateOptions] = await Promise.all([
      new InvoiceManagementService(prisma).get(user.orgId, storeId),
      createWhatsAppInvoiceTemplateService().options(user.orgId, storeId),
    ]);
    return NextResponse.json({ settings, templateOptions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice settings could not be loaded" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const storeId = new URL(request.url).searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "Store is required" }, { status: 400 });
  const parsed = invoiceManagementSettingsUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => ({
      code: issue.code,
      path: issue.path.map(String),
      message: issue.message,
    }));
    return NextResponse.json(
      {
        error: issues[0]?.message || "Invalid invoice settings",
        issues,
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  try {
    const settings = await new InvoiceManagementService(prisma).save(
      user.orgId,
      storeId,
      parsed.data
    );
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof InvoiceManagementValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          issues: [{ code: "custom", path: [error.field], message: error.message }],
          fieldErrors: { [error.field]: [error.message] },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice settings could not be saved" },
      { status: 400 }
    );
  }
}
