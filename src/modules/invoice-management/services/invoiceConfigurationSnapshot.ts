import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  InvoiceConfigurationSnapshot,
  InvoiceDesignKey,
} from "../types.ts";

export async function resolveInvoiceConfigurationSnapshot(
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
  storeId: string
): Promise<InvoiceConfigurationSnapshot & { policyVersionId: string | null }> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId: organizationId },
    select: {
      invoiceSettings: {
        include: { activePolicyVersion: true },
      },
    },
  });
  if (!store) throw new Error("INVOICE_STORE_NOT_FOUND");
  const settings = store.invoiceSettings;
  const policy = settings?.activePolicyVersion;
  const designKey = (["CLASSIC", "PREMIUM", "COMPACT"] as const).includes(
    settings?.designKey as InvoiceDesignKey
  )
    ? (settings?.designKey as InvoiceDesignKey)
    : "CLASSIC";
  return {
    design: { key: designKey, version: 1 },
    policy: {
      id: policy?.id ?? null,
      version: policy?.version ?? null,
      effectiveFrom: policy?.effectiveFrom.toISOString() ?? null,
      termsText: policy?.termsText ?? null,
      exchangePolicyText: policy?.exchangePolicyText ?? null,
      returnPolicyText: policy?.returnPolicyText ?? null,
      thankYouMessage: policy?.thankYouMessage ?? null,
      storeSubtitle: policy?.storeSubtitle ?? null,
      footerNote: policy?.footerNote ?? null,
      signatureText: policy?.signatureText ?? null,
      qrHelperText: policy?.qrHelperText ?? null,
    },
    policyVersionId: policy?.id ?? null,
  };
}
