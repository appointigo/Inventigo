export type SupportedPaymentMethod = "CASH" | "UPI" | "CARD";

const LABELS: Record<SupportedPaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
};

export function aggregatePaymentEntries(
  payments: Array<{ method: SupportedPaymentMethod; amount: number }>
) {
  const totals = new Map<SupportedPaymentMethod, { value: number; count: number }>(
    (Object.keys(LABELS) as SupportedPaymentMethod[]).map((method) => [
      method,
      { value: 0, count: 0 },
    ])
  );
  payments
    .filter((payment) => payment.amount > 0)
    .forEach((payment) => {
      const row = totals.get(payment.method)!;
      row.value += payment.amount;
      row.count += 1;
    });
  const totalReceived = Number(
    Array.from(totals.values())
      .reduce((sum, row) => sum + row.value, 0)
      .toFixed(2)
  );
  const refundsPaid = Number(
    payments
      .filter((payment) => payment.amount < 0)
      .reduce((sum, payment) => sum + Math.abs(payment.amount), 0)
      .toFixed(2)
  );
  return {
    methods:
      totalReceived === 0
        ? []
        : Array.from(totals.entries())
            .filter(([, row]) => row.value !== 0)
            .map(([method, row]) => ({
              name: LABELS[method],
              value: Number(row.value.toFixed(2)),
              count: row.count,
              percentage: Number(((row.value / totalReceived) * 100).toFixed(2)),
            })),
    totalReceived,
    refundsPaid,
    netCustomerMovement: Number((totalReceived - refundsPaid).toFixed(2)),
  };
}
