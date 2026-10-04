export type SupportedPaymentMethod = "CASH" | "UPI" | "CARD";

const LABELS: Record<SupportedPaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
};

export function aggregatePaymentEntries(
  payments: Array<{ method: SupportedPaymentMethod; amount: number }>,
) {
  const totals = new Map<SupportedPaymentMethod, { value: number; count: number }>(
    (Object.keys(LABELS) as SupportedPaymentMethod[]).map((method) => [method, { value: 0, count: 0 }]),
  );
  payments.forEach((payment) => {
    const row = totals.get(payment.method)!;
    row.value += payment.amount;
    row.count += 1;
  });
  const totalReceived = Array.from(totals.values()).reduce((sum, row) => sum + row.value, 0);
  return {
    methods: totalReceived === 0 ? [] : Array.from(totals.entries())
      .filter(([, row]) => row.value !== 0)
      .map(([method, row]) => ({
        name: LABELS[method],
        value: Number(row.value.toFixed(2)),
        count: row.count,
        percentage: Number(((row.value / totalReceived) * 100).toFixed(2)),
      })),
    totalReceived: Number(totalReceived.toFixed(2)),
  };
}
