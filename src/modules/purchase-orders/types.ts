import { PurchaseOrderStatus } from "@prisma/client";

export type POFormValues = {
  storeId: string;
  supplierId: string;
  notes?: string;
  expectedDeliveryDate?: string | null;
  items: POItemFormValues[];
};

export type POItemFormValues = {
  productId: string;
  sizeId: string;
  quantity: number;
  unitCost: number;
};

export type POListFilters = {
  storeId?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
};

export type POItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  sizeId: string;
  sizeLabel: string;
  quantity: number;
  unitCost: number;
  total: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  outstandingQuantity: number;
  receiptStatus: "NOT_RECEIVED" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "OVER_RECEIVED";
};

export type PurchaseOrder = {
  id: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  expectedDeliveryDate: string | null;
  createdBy: string;
  createdByName: string;
  items: POItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReceiveItemInput = {
  purchaseOrderItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  rejectionReason?: string;
  unitCostActual?: number;
};

export type ReceivePOInput = {
  receivedAt?: string;
  supplierInvoiceNumber?: string;
  notes?: string;
  items: ReceiveItemInput[];
};
