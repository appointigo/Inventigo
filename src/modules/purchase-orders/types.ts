import { PurchaseOrderStatus } from "@prisma/client";

export type POFormValues = {
  storeId: string;
  supplierId: string;
  notes?: string;
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
