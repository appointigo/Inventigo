import { NextResponse } from "next/server";
import { hasValidCronAuthorization } from "@/lib/server/cronAuth";
import { getDeploymentEnvironmentLabel } from "@/modules/whatsapp/invoiceDiagnostics";
import { createWhatsAppInvoiceDeliveryService } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export function HEAD(request: Request) {
  const authorized = hasValidCronAuthorization(
    process.env.CRON_SECRET,
    request.headers.get("authorization")
  );
  return new Response(null, {
    status: authorized ? 204 : 401,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const deploymentEnvironment = getDeploymentEnvironmentLabel();
  if (!hasValidCronAuthorization(process.env.CRON_SECRET, request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    console.info("[WhatsApp Invoice Worker] worker_started", {
      deploymentEnvironment,
      stage: "WORKER_START",
    });
    const invoices = await createWhatsAppInvoiceDeliveryService().processBatch();
    console.info("[WhatsApp Invoice Worker] worker_completed", {
      deploymentEnvironment,
      stage: "WORKER_COMPLETE",
      ...invoices,
    });
    return NextResponse.json({ invoices });
  } catch (error) {
    console.warn("[WhatsApp Invoice Worker] worker_failed", {
      deploymentEnvironment,
      stage: "WORKER_FAILED",
      errorCode:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : error instanceof Error
            ? error.name
            : "WHATSAPP_INVOICE_WORKER_FAILED",
    });
    return NextResponse.json({ error: "WhatsApp invoice worker failed" }, { status: 500 });
  }
}
