import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasValidCronAuthorization } from "@/lib/server/cronAuth";
import {
  INVOICE_SMOKE_TEST_CONFIRMATION,
  inspectInvoiceSmokeCandidate,
} from "@/modules/whatsapp/invoiceSmokeTest";
import { createWhatsAppInvoiceDeliveryService } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const candidateSelect = {
  id: true,
  purpose: true,
  direction: true,
  status: true,
  dispatchClaimedAt: true,
  metaMessageId: true,
  organizationId: true,
  referenceId: true,
  referenceType: true,
  payload: true,
} as const;

const authorized = (request: Request) =>
  hasValidCronAuthorization(process.env.CRON_SECRET, request.headers.get("authorization"));

async function loadCandidate(id: string) {
  return prisma.whatsAppMessage.findUnique({ where: { id }, select: candidateSelect });
}

async function hasTransactionalConsent(candidate: Awaited<ReturnType<typeof loadCandidate>>) {
  if (!candidate?.referenceId) return false;
  const transaction = candidate.referenceType === "SALE"
    ? await prisma.sale.findFirst({
        where: { id: candidate.referenceId, store: { orgId: candidate.organizationId } },
        select: { customerId: true },
      })
    : candidate.referenceType === "RETURN_TRANSACTION"
      ? await prisma.returnTransaction.findFirst({
          where: { id: candidate.referenceId, store: { orgId: candidate.organizationId } },
          select: { customerId: true },
        })
      : null;
  if (!transaction?.customerId) return false;
  const consent = await prisma.whatsAppConsent.findFirst({
    where: {
      purpose: "TRANSACTIONAL",
      status: "GRANTED",
      contact: {
        organizationId: candidate.organizationId,
        customerId: transaction.customerId,
      },
    },
    select: { id: true },
  });
  return Boolean(consent);
}

function inspect(
  candidate: Awaited<ReturnType<typeof loadCandidate>>,
  id: string,
  input?: { expectedReference?: string; confirmation?: string; transactionalConsentGranted?: boolean }
) {
  return inspectInvoiceSmokeCandidate(candidate, {
    allowedDeliveryId: process.env.WHATSAPP_INVOICE_SMOKE_TEST_DELIVERY_ID,
    allowedRecipient: process.env.WHATSAPP_INVOICE_SMOKE_TEST_RECIPIENT,
    requestedDeliveryId: id,
    expectedReference: input?.expectedReference,
    confirmation: input?.confirmation,
    transactionalConsentGranted: input?.transactionalConsentGranted,
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const candidate = await loadCandidate(id);
  const transactionalConsentGranted = await hasTransactionalConsent(candidate);
  const payload = candidate?.payload && typeof candidate.payload === "object" && !Array.isArray(candidate.payload)
    ? candidate.payload as { invoiceDelivery?: { reference?: string } }
    : {};
  const result = inspect(candidate, id, {
    expectedReference: payload.invoiceDelivery?.reference,
    confirmation: INVOICE_SMOKE_TEST_CONFIRMATION,
    transactionalConsentGranted,
  });
  return NextResponse.json({
    deliveryId: id,
    eligible: result.eligible,
    reasons: result.reasons,
    reference: result.reference,
    recipientLast4: result.recipientLast4,
    status: result.status,
  }, { status: candidate ? 200 : 404, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as {
    deliveryId?: string;
    expectedReference?: string;
    confirmation?: string;
  } | null;
  if (!body || body.deliveryId !== id) {
    return NextResponse.json({ error: "Delivery confirmation does not match the route" }, { status: 400 });
  }

  const candidate = await loadCandidate(id);
  const transactionalConsentGranted = await hasTransactionalConsent(candidate);
  const result = inspect(candidate, id, { ...body, transactionalConsentGranted });
  if (!result.eligible) {
    console.warn("[WhatsApp Invoice Smoke] delivery_blocked", {
      deliveryId: id,
      stage: "SMOKE_TEST_GUARD",
      reasons: result.reasons,
    });
    return NextResponse.json({ error: "Invoice smoke test is not eligible", reasons: result.reasons }, { status: 409 });
  }

  console.info("[WhatsApp Invoice Smoke] delivery_started", {
    deliveryId: id,
    stage: "SMOKE_TEST_START",
    reference: result.reference,
    recipientLast4: result.recipientLast4,
  });
  const delivered = await createWhatsAppInvoiceDeliveryService().processMessage(id);
  console.info("[WhatsApp Invoice Smoke] delivery_completed", {
    deliveryId: id,
    stage: "SMOKE_TEST_COMPLETE",
    status: delivered.status,
    providerMessageIdPresent: Boolean(delivered.metaMessageId),
  });
  return NextResponse.json({
    deliveryId: delivered.id,
    status: delivered.status,
    providerMessageIdPresent: Boolean(delivered.metaMessageId),
  });
}
