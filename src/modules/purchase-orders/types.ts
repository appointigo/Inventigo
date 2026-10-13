import { PurchaseOrderStatus } from "@prisma/client";

export type POFormValues = {
  storeId: string;
  supplierId: string;
  notes?: string;
  deliveryInstructions?: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  items: PurchaseOrderLineInput[];
};

export type POItemFormValues = {
  itemKind?: "EXISTING_PRODUCT";
  lineGroupId?: string;
  productId: string;
  sizeId: string;
  variantId?: string;
  colour?: string;
  supplierReference?: string;
  notes?: string;
  quantity: number;
  unitCost: number;
};

export type ProvisionalPOItemFormValues = {
  itemKind: "PROVISIONAL_PRODUCT";
  lineGroupId?: string;
  productName: string;
  proposedSku?: string;
  brandId?: string;
  categoryId?: string;
  styleModel?: string;
  colour?: string;
  sizeLabel?: string;
  supplierReference?: string;
  imageUrl?: string;
  expectedSellingPrice?: number;
  notes?: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderLineInput = POItemFormValues | ProvisionalPOItemFormValues;

export type POUpdateValues = Omit<Partial<POFormValues>, "notes" | "deliveryInstructions"> & {
  notes?: string | null;
  deliveryInstructions?: string | null;
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
  itemKind: "EXISTING_PRODUCT" | "PROVISIONAL_PRODUCT";
  lineGroupId: string;
  productId: string | null;
  productName: string;
  productSku: string | null;
  sizeId: string | null;
  sizeLabel: string;
  brandName: string | null;
  categoryName: string | null;
  styleModel: string | null;
  colour: string | null;
  supplierReference: string | null;
  imageUrl: string | null;
  expectedSellingPrice: number | null;
  notes: string | null;
  isCatalogResolved: boolean;
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
  poNumber: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  storeName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes: string | null;
  deliveryInstructions: string | null;
  orderDate: string;
  orderedAt: string | null;
  receivedAt: string | null;
  closedAt: string | null;
  closureReason: string | null;
  expectedDeliveryDate: string | null;
  createdBy: string;
  createdByName: string;
  items: POItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReceiveItemInput = {
  mappingKey?: string;
  purchaseOrderItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  heldQuantity?: number;
  rejectionReason?: string;
  batchReference?: string;
  defectQuantity?: number;
  defectReason?: string;
  defectImageUrls?: string[];
  unitCostActual?: number;
  notes?: string;
  catalogResolution?:
    | { mode: "LINK_EXISTING"; productId: string; sizeId: string }
    | {
        mode: "CREATE_PRODUCT";
        sku?: string;
        sellingPrice?: number;
        externalBarcode?: string;
      };
};

export type ReceivePOInput = {
  confirmationId: string;
  receivedAt?: string;
  receiptReference?: string;
  supplierInvoiceNumber?: string;
  notes?: string;
  items: ReceiveItemInput[];
};
