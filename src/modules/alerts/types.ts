export type AlertConfig = {
  id: string;
  storeId: string | null;
  productId: string | null;
  productName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  threshold: number;
  notifyEmail: boolean;
  notifySMS: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AlertConfigFormValues = {
  productId?: string;
  categoryId?: string;
  threshold: number;
  notifyEmail: boolean;
  notifySMS: boolean;
  isActive: boolean;
};

export type LowStockItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  brandName: string;
  sizeLabel: string;
  quantity: number;
  reorderLevel: number;
  deficit: number;
};
