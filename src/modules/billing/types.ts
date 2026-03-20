import { PaymentMethod } from "@prisma/client";

/**
 * Input for creating a new sale.
 */
export type CreateSaleInput = {
  storeId: string;
  items: CreateSaleItemInput[];
  paymentMethod: PaymentMethod;
  discountAmount?: number;
  taxAmount?: number;
  customerName?: string;
  customerPhone?: string;
  userId: string;
};

export type CreateSaleItemInput = {
  productId: string;
  sizeId: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Filters for querying sales.
 */
export type SaleFilters = {
  storeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: "COMPLETED" | "REFUNDED";
  search?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Sale summary for display.
 */
export type SaleSummary = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  total: number;
  paymentMethod: PaymentMethod;
  status: string;
  itemCount: number;
  createdAt: Date;
};
