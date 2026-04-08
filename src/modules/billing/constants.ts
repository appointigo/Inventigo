import type { PaymentMethodType } from "./types";

export interface PromoOffer {
  code: string;
  label: string;
  desc: string;
  discountPct: number;
}

export const AVAILABLE_OFFERS: PromoOffer[] = [
  { code: "SAVE10", label: "10% OFF", desc: "Flat 10% discount on your order", discountPct: 10 },
  { code: "FLAT15", label: "15% OFF", desc: "Save 15% — use code FLAT15", discountPct: 15 },
  { code: "NEWUSER", label: "5% OFF", desc: "Welcome discount for new customers", discountPct: 5 },
];

export const PAYMENT_OPTIONS: { label: string; value: PaymentMethodType; icon: string }[] = [
  { label: "Cash", value: "CASH", icon: "💵" },
  { label: "Card", value: "CARD", icon: "💳" },
  { label: "UPI", value: "UPI", icon: "📱" },
];
