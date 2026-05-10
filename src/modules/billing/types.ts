export type PaymentMethodType = "CASH" | "CARD" | "UPI";
export type SaleStatusType = "COMPLETED" | "REFUNDED" | "EXCHANGED";

/**
 * Input for creating a new sale.
 */
export type CreateSaleInput = {
  items: CartItem[];
  paymentMethod: PaymentMethodType;
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
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  returnStatus: "NONE" | "PARTIAL" | "FULL";
  status: SaleStatusType;
  items: SaleItem[];
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
  paymentMethod: PaymentMethodType;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  returnStatus: "NONE" | "PARTIAL" | "FULL";
  status: SaleStatusType;
  itemCount: number;
  transactionDate: string;
  createdAt: string;
};
