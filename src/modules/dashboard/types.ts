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
