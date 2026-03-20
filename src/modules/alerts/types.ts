export type AlertConfigFormValues = {
  storeId?: string;
  productId?: string;
  categoryId?: string;
  threshold: number;
  notifyEmail: boolean;
  notifySMS: boolean;
  isActive: boolean;
};
