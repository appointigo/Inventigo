export type AgingBucket = "0–7 days" | "8–30 days" | "31–60 days" | "61–90 days" | "90+ days";

export function ageSinceSale(transactionDate: Date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - transactionDate.getTime()) / 86_400_000));
}

export function receivableBucket(age: number): AgingBucket {
  if (age <= 7) return "0–7 days";
  if (age <= 30) return "8–30 days";
  if (age <= 60) return "31–60 days";
  if (age <= 90) return "61–90 days";
  return "90+ days";
}

export function canonicalOutstanding(input: {
  amountDue: number;
  finalPayableAmount?: number | null;
  total: number;
  amountPaid: number;
}) {
  return Math.max(0, Number(input.amountDue));
}
