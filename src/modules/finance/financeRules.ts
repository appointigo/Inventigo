export type PayableAgingBucket =
  | "NOT_DUE"
  | "DUE_TODAY"
  | "OVERDUE_0_7"
  | "OVERDUE_8_30"
  | "OVERDUE_31_60"
  | "OVERDUE_61_90"
  | "OVERDUE_90_PLUS"
  | "DUE_DATE_MISSING";

const day = 86_400_000;
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function accountBalance(opening: number, inflows: number, outflows: number) {
  return roundMoney(opening + inflows - outflows);
}

export function customerSettlement(invoiceAmount: number, payments: number[]) {
  const collected = roundMoney(payments.reduce((sum, payment) => sum + payment, 0));
  if (invoiceAmount < 0 || payments.some((payment) => payment <= 0) || collected > invoiceAmount) {
    throw new Error("Customer settlement is outside invoice bounds");
  }
  return { cashInflow: collected, receivable: roundMoney(invoiceAmount - collected) };
}

export function splitPaymentPostings(entries: Array<{ accountId: string | null; amount: number }>) {
  if (entries.some((entry) => entry.amount <= 0)) throw new Error("Payment amount must be greater than zero");
  return entries.map((entry) => ({ ...entry, direction: "INFLOW" as const }));
}

export function refundCashImpact(liabilityAmount: number, settledAmount: number) {
  const state = refundState(liabilityAmount, settledAmount);
  return { ...state, cashOutflow: roundMoney(settledAmount) };
}

export function payableState(original: number, paid: number) {
  if (original <= 0) throw new Error("Original amount must be greater than zero");
  if (paid < 0 || paid > original) throw new Error("Paid amount is outside payable bounds");
  const outstanding = roundMoney(original - paid);
  return { outstanding, status: outstanding === 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "OPEN" } as const;
}

export function refundState(liability: number, settled: number) {
  if (liability <= 0) throw new Error("Refund liability must be greater than zero");
  if (settled < 0 || settled > liability) throw new Error("Settled amount is outside refund bounds");
  const outstanding = roundMoney(liability - settled);
  return { outstanding, status: outstanding === 0 ? "SETTLED" : settled > 0 ? "PARTIAL" : "PENDING" } as const;
}

export function payableAging(dueDate: Date | null, asOf: Date): PayableAgingBucket {
  if (!dueDate) return "DUE_DATE_MISSING";
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const now = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const overdueDays = Math.floor((now - due) / day);
  if (overdueDays < 0) return "NOT_DUE";
  if (overdueDays === 0) return "DUE_TODAY";
  if (overdueDays <= 7) return "OVERDUE_0_7";
  if (overdueDays <= 30) return "OVERDUE_8_30";
  if (overdueDays <= 60) return "OVERDUE_31_60";
  if (overdueDays <= 90) return "OVERDUE_61_90";
  return "OVERDUE_90_PLUS";
}

export function cashCoverage(availableCash: number, obligations: number) {
  const buffer = roundMoney(availableCash - obligations);
  return { buffer, gap: buffer < 0 ? Math.abs(buffer) : 0, isCovered: buffer >= 0 };
}

export function operatingWorkingCapital(receivables: number, inventory: number, payables: number) {
  return roundMoney(receivables + inventory - payables);
}

export function transferNetMovement(amount: number) {
  if (amount <= 0) throw new Error("Transfer amount must be greater than zero");
  return { source: -roundMoney(amount), destination: roundMoney(amount), organizationNet: 0 };
}
