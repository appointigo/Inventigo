export type BrandFormValues = {
  name: string;
  logoUrl?: string;
  isActive: boolean;
  storeId?: string;
};

export type Brand = {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
