type Numeric = number | string | { toString(): string } | null | undefined;

export type RawSaleItem = {
  quantity?: Numeric;
  unitPrice?: Numeric;
  total?: Numeric;
  mrp?: Numeric;
  sellingPrice?: Numeric;
  discountType?: string | null;
  appliedDiscountPercent?: Numeric;
  allocatedDiscount?: Numeric;
  taxableAmount?: Numeric;
  taxAmount?: Numeric;
  finalUnitPrice?: Numeric;
  finalLineAmount?: Numeric;
  effectiveUnitPrice?: Numeric;
  pricingSnapshotDate?: Date | string | null;
  [key: string]: unknown;
};

export type RawSaleForCompatibility = {
  id?: string;
  total?: Numeric;
  finalPayableAmount?: Numeric;
  discountAmount?: Numeric;
  taxAmount?: Numeric;
  amountPaid?: Numeric;
  amountDue?: Numeric;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  transactionDate?: Date | string | null;
  createdAt?: Date | string | null;
  items?: RawSaleItem[];
  payments?: Array<Record<string, unknown> & { amount?: Numeric; method?: string }>;
};

const toNumber = (value: Numeric): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCents = (value: Numeric): number => Math.round(toNumber(value) * 100);
const fromCents = (value: number): number => Number((value / 100).toFixed(2));

const allocateCents = (total: number, bases: number[]): number[] => {
  const target = Math.max(0, Math.round(total));
  const baseTotal = bases.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (target === 0 || baseTotal === 0) return bases.map(() => 0);

  let allocated = 0;
  return bases.map((base, index) => {
    if (index === bases.length - 1) return target - allocated;
    const share = Math.round((target * Math.max(0, base)) / baseTotal);
    allocated += share;
    return share;
  });
};

/**
 * Normalizes sales created before pricing snapshots and payment ledgers existed.
 * `pricingSnapshotDate` is the version marker: migration defaults in the other
 * columns are not evidence of a real zero price.
 */
export function normalizeSaleCompatibility<T extends RawSaleForCompatibility>(sale: T) {
  const sourceItems = sale.items ?? [];
  const legacyBases = sourceItems.map((item) =>
    item.pricingSnapshotDate == null
      ? Math.max(0, toCents(item.total) || toCents(item.unitPrice) * Math.max(0, toNumber(item.quantity)))
      : 0
  );
  const legacyBaseTotal = legacyBases.reduce((sum, value) => sum + value, 0);
  const legacyDiscountTarget = Math.min(toCents(sale.discountAmount), legacyBaseTotal);
  const legacyTaxTarget = Math.max(0, toCents(sale.taxAmount));
  const discountShares = allocateCents(legacyDiscountTarget, legacyBases);
  const discountedBases = legacyBases.map((base, index) => Math.max(0, base - discountShares[index]));
  const taxShares = allocateCents(legacyTaxTarget, discountedBases);

  const items = sourceItems.map((item, index) => {
    if (item.pricingSnapshotDate != null) return item;

    const quantity = Math.max(0, toNumber(item.quantity));
    const baseLineCents = legacyBases[index];
    const discountCents = discountShares[index];
    const lineCents = Math.max(0, baseLineCents - discountCents);
    const taxCents = taxShares[index];
    const mrpCents = quantity > 0 ? Math.round(baseLineCents / quantity) : toCents(item.unitPrice);
    const finalUnitCents = quantity > 0 ? Math.round(lineCents / quantity) : 0;
    const effectiveUnitCents = quantity > 0 ? Math.round((lineCents + taxCents) / quantity) : 0;

    return {
      ...item,
      mrp: fromCents(mrpCents),
      sellingPrice: fromCents(mrpCents),
      discountType: item.discountType ?? "FLAT",
      appliedDiscountPercent: baseLineCents > 0
        ? Number(((discountCents / baseLineCents) * 100).toFixed(2))
        : 0,
      allocatedDiscount: fromCents(discountCents),
      taxableAmount: fromCents(lineCents),
      taxAmount: fromCents(taxCents),
      finalUnitPrice: fromCents(finalUnitCents),
      finalLineAmount: fromCents(lineCents),
      effectiveUnitPrice: fromCents(effectiveUnitCents),
    };
  });

  const invoiceTotal = toNumber(sale.finalPayableAmount ?? sale.total);
  const realPayments = sale.payments ?? [];
  const paidFromLedger = realPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const isLegacySale = sourceItems.length > 0 && sourceItems.every((item) => item.pricingSnapshotDate == null);
  const useLegacyPaidFallback = isLegacySale && realPayments.length === 0 && sale.paymentStatus === "PAID";
  const amountPaid = realPayments.length > 0
    ? paidFromLedger
    : useLegacyPaidFallback
      ? invoiceTotal
      : toNumber(sale.amountPaid);
  const amountDue = useLegacyPaidFallback ? 0 : toNumber(sale.amountDue);
  const payments = useLegacyPaidFallback
    ? [{
        id: `legacy-payment:${sale.id ?? "sale"}`,
        saleId: sale.id,
        amount: invoiceTotal,
        method: sale.paymentMethod ?? "CASH",
        businessDate: sale.transactionDate ?? sale.createdAt,
        paidAt: sale.transactionDate ?? sale.createdAt,
        createdBy: "legacy-system",
      }]
    : realPayments;

  return { ...sale, items, payments, amountPaid, amountDue };
}
