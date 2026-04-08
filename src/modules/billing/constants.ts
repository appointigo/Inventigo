import type { PaymentMethodType } from "./types";

export const PAYMENT_OPTIONS: { label: string; value: PaymentMethodType; icon: string }[] = [
  { label: "Cash", value: "CASH", icon: "💵" },
  { label: "Card", value: "CARD", icon: "💳" },
  { label: "UPI", value: "UPI", icon: "📱" },
];
