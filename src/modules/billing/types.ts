export type PaymentMethodType = "CASH" | "CARD" | "UPI";
export type SaleStatusType = "COMPLETED" | "REFUNDED";

/**
 * Input for creating a new sale.
 */
export type CreateSaleInput = {
  items: CartItem[];
  paymentMethod: PaymentMethodType;
  discountAmount: number;
  taxAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  promoCodeId?: string;
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
};

/**
 * Full sale detail with items.
 */
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
  paymentMethod: PaymentMethodType;
  status: SaleStatusType;
  items: SaleItem[];
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
  paymentMethod: PaymentMethodType;
  status: SaleStatusType;
  itemCount: number;
  createdAt: string;
};
