export type PaymentMethodType = "CASH" | "CARD" | "UPI";
export type SaleStatusType = "COMPLETED" | "REFUNDED" | "EXCHANGED";

/**
 * Single payment entry in a split payment
 */
export type SplitPaymentEntry = {
  method: PaymentMethodType;
  amount: number;
};

/**
 * Split payment data with multiple payment methods
 */
export type SplitPaymentData = {
  entries: SplitPaymentEntry[];
};

/**
 * Input for creating a new sale.
 * Supports both single payment (paymentMethod) and split payments (splitPayments)
 */
export type CreateSaleInput = {
  items: CartItem[];
  paymentMethod?: PaymentMethodType; // For backward compatibility and single payment
  splitPayments?: SplitPaymentEntry[]; // For split payment mode
  discountType?: "PERCENTAGE" | "FLAT";
  discountPercent?: number;
  taxRate?: number;
  taxMode?: "EXCLUSIVE" | "INCLUSIVE";
  discountAmount: number;
  taxAmount: number;
  amountPaid?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  promoCodeId?: string;
  transactionDate?: string;
};

export type CartItem = {
  productId: string;
  productName: string;
  sku: string;
  sizeId: string;
  sizeLabel: string;
  attributes: Record<string, unknown>;
  quantity: number;
  unitPrice: number;
};

/**
 * Filters for querying sales.
 */
export type SaleFilters = {
  startDate?: string;
  endDate?: string;
  status?: SaleStatusType;
  paymentMethod?: PaymentMethodType;
  search?: string;
  type?: "SALE" | "EXCHANGE" | "RETURN";
};

/**
 * Full sale detail with items.
 */
export type ReturnTransactionItem = {
  productId: string;
  sizeId: string;
  quantity: number;
  total: number;
  productName?: string;
  sku?: string;
  sizeLabel?: string;
};

export type ReturnTransactionHistory = {
  id: string;
  type: "RETURN" | "EXCHANGE" | "RETURN_EXCHANGE";
  referenceNumber?: string;
  saleInvoiceNumber?: string;
  returnedItems: ReturnTransactionItem[];
  exchangedItems: ReturnTransactionItem[];
  netAmount: number;
  offsetAmount: number;
  refundAmount: number;
  refundMethod?: PaymentMethodType;
  reason?: string;
  condition?: string;
  notes?: string;
  createdAt: string;
};

/**
 * Individual payment record for a sale
 */
export type SalePayment = {
  id: string;
  saleId: string;
  amount: number;
  method: PaymentMethodType;
  businessDate: string;
  paidAt: string;
  note?: string;
  createdBy: string;
};

export type Sale = {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number; // finalPayableAmount for backward compatibility
  calculatedTotal?: number;
  roundOffAmount: number;
  finalPayableAmount?: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: PaymentMethodType | "SPLIT"; // SPLIT indicates multiple payment methods
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  returnStatus: "NONE" | "PARTIAL" | "FULL";
  status: SaleStatusType;
  items: SaleItem[];
  payments?: SalePayment[]; // Individual payment records
  returnTransactions: ReturnTransactionHistory[];
  transactionDate: string;
  createdAt: string;
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  sizeId: string;
  sizeLabel: string;
  attributes: Record<string, unknown>;
  quantity: number;
  unitPrice: number;
  total: number;
  mrp?: number;
  sellingPrice?: number;
  discountType?: "PERCENTAGE" | "FLAT";
  appliedDiscountPercent?: number;
  allocatedDiscount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  finalUnitPrice?: number;
  finalLineAmount?: number;
  effectiveUnitPrice?: number;
  costPrice?: number;
  pricingSnapshotDate?: string;
};

/**
 * A flattened row representing one product × size combination, used for
 * billing product search and selection.
 */
export type VariantRow = {
  rowKey: string;
  productId: string;
  productName: string;
  sku: string;
  externalBarcode: string | null;
  variantSku: string | null;
  brandName: string;
  categoryName: string;
  basePrice: number;
  isActive: boolean;
  attributes: Record<string, unknown>;
  sizeId: string;
  sizeLabel: string;
  stockQty: number;
};

/**
 * Sale summary for list display.
 */
export type SaleSummary = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: PaymentMethodType | "SPLIT";
  payments?: Array<{
    method: PaymentMethodType;
    amount: number;
    businessDate?: string;
    paidAt?: string;
  }>;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  returnStatus: "NONE" | "PARTIAL" | "FULL";
  status: SaleStatusType;
  itemCount: number;
  transactionDate: string;
  createdAt: string;
};
