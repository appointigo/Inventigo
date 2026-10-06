export type RefundMethod = "CASH" | "CARD" | "UPI";

export type RefundPaymentInput = {
  method: RefundMethod;
  amount: number;
};

export const refundIdempotencyKey = (orgId: string, saleId: string, requestId: string) =>
  `RETURN:${orgId}:${saleId}:${requestId}`;

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function planRefundAccounting(refundAmount: number, payments: RefundPaymentInput[]) {
  const liabilityAmount = money(refundAmount);
  if (liabilityAmount < 0 || payments.some((payment) => payment.amount <= 0)) {
    throw new Error("Refund amounts must be non-negative");
  }
  const settledAmount = money(payments.reduce((sum, payment) => sum + payment.amount, 0));
  if (settledAmount > liabilityAmount) throw new Error("Refund payments exceed the obligation");
  const outstandingAmount = money(liabilityAmount - settledAmount);
  const status =
    liabilityAmount === 0
      ? null
      : outstandingAmount === 0
        ? ("SETTLED" as const)
        : settledAmount > 0
          ? ("PARTIAL" as const)
          : ("PENDING" as const);
  return {
    liabilityAmount,
    settledAmount,
    outstandingAmount,
    status,
    payments: payments.map((payment) => ({ ...payment, amount: money(payment.amount) })),
  };
}
