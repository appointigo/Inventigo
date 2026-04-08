export interface PromoCode {
  id: string;
  code: string;
  label: string;
  desc: string;
  discountPct: number;
  isActive: boolean;
  maxUses: number | null;
  usageCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatePromoInput {
  code: string;
  label: string;
  desc?: string;
  discountPct: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface UpdatePromoInput {
  code?: string;
  label?: string;
  desc?: string;
  discountPct?: number;
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface PromoUsageSale {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  discountAmount: number;
  customerName: string | null;
  customerPhone: string | null;
}
