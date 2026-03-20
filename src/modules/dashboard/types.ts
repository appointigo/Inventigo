export type DashboardKPIs = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  pendingPOsCount: number;
};

export type StockByCategory = {
  category: string;
  totalQuantity: number;
};

export type TopBrand = {
  brand: string;
  stockValue: number;
};

export type RecentMovement = {
  id: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  type: string;
  quantity: number;
  reason: string | null;
  userName: string;
  createdAt: string;
};

export type DashboardData = {
  kpis: DashboardKPIs;
  stockByCategory: StockByCategory[];
  topBrands: TopBrand[];
  recentMovements: RecentMovement[];
};
