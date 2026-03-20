// Mock stock service for UI-first development
// TODO: Replace with real stockService (which uses Prisma) when DB is connected

export type MockStockRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  brandName: string;
  sizeId: string;
  sizeLabel: string;
  quantity: number;
  reorderLevel: number;
  status: "OK" | "LOW" | "OUT";
};

export type MockStockMovement = {
  id: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "SALE" | "RETURN";
  quantity: number;
  reason: string | null;
  userName: string;
  createdAt: string;
};

export type MockAdjustInput = {
  productId: string;
  sizeId: string;
  quantity: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  reason?: string;
};

// Build stock rows from product mock data
const stockRows: MockStockRow[] = [
  // Nike Dri-FIT Running Tee
  { id: "se-1", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike", sizeId: "s-26", sizeLabel: "S", quantity: 15, reorderLevel: 5, status: "OK" },
  { id: "se-2", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike", sizeId: "s-27", sizeLabel: "M", quantity: 25, reorderLevel: 5, status: "OK" },
  { id: "se-3", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike", sizeId: "s-28", sizeLabel: "L", quantity: 20, reorderLevel: 5, status: "OK" },
  { id: "se-4", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike", sizeId: "s-29", sizeLabel: "XL", quantity: 10, reorderLevel: 5, status: "OK" },
  { id: "se-5", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike", sizeId: "s-30", sizeLabel: "XXL", quantity: 5, reorderLevel: 5, status: "LOW" },
  // Adidas Classic Round Neck Tee
  { id: "se-6", productId: "prod-2", productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001", categoryName: "T-Shirts", brandName: "Adidas", sizeId: "s-2", sizeLabel: "S", quantity: 20, reorderLevel: 5, status: "OK" },
  { id: "se-7", productId: "prod-2", productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001", categoryName: "T-Shirts", brandName: "Adidas", sizeId: "s-3", sizeLabel: "M", quantity: 30, reorderLevel: 5, status: "OK" },
  { id: "se-8", productId: "prod-2", productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001", categoryName: "T-Shirts", brandName: "Adidas", sizeId: "s-4", sizeLabel: "L", quantity: 25, reorderLevel: 5, status: "OK" },
  // Levi's 511, show some low/out stock
  { id: "se-9", productId: "prod-4", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", categoryName: "Jeans", brandName: "Levi's", sizeId: "s-12", sizeLabel: "28", quantity: 3, reorderLevel: 5, status: "LOW" },
  { id: "se-10", productId: "prod-4", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", categoryName: "Jeans", brandName: "Levi's", sizeId: "s-13", sizeLabel: "30", quantity: 15, reorderLevel: 5, status: "OK" },
  { id: "se-11", productId: "prod-4", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", categoryName: "Jeans", brandName: "Levi's", sizeId: "s-14", sizeLabel: "32", quantity: 0, reorderLevel: 5, status: "OUT" },
  { id: "se-12", productId: "prod-4", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", categoryName: "Jeans", brandName: "Levi's", sizeId: "s-15", sizeLabel: "34", quantity: 12, reorderLevel: 5, status: "OK" },
  // Allen Solly Formal Shirt
  { id: "se-13", productId: "prod-6", productName: "Allen Solly Formal Shirt", sku: "AS-FS-001", categoryName: "Shirts", brandName: "Allen Solly", sizeId: "s-7", sizeLabel: "S", quantity: 2, reorderLevel: 5, status: "LOW" },
  { id: "se-14", productId: "prod-6", productName: "Allen Solly Formal Shirt", sku: "AS-FS-001", categoryName: "Shirts", brandName: "Allen Solly", sizeId: "s-8", sizeLabel: "M", quantity: 20, reorderLevel: 5, status: "OK" },
  { id: "se-15", productId: "prod-6", productName: "Allen Solly Formal Shirt", sku: "AS-FS-001", categoryName: "Shirts", brandName: "Allen Solly", sizeId: "s-9", sizeLabel: "L", quantity: 0, reorderLevel: 5, status: "OUT" },
  // Puma Slim Pants
  { id: "se-16", productId: "prod-12", productName: "Puma Slim Pants", sku: "PM-SP-001", categoryName: "Pants", brandName: "Puma", sizeId: "s-19", sizeLabel: "28", quantity: 5, reorderLevel: 5, status: "LOW" },
  { id: "se-17", productId: "prod-12", productName: "Puma Slim Pants", sku: "PM-SP-001", categoryName: "Pants", brandName: "Puma", sizeId: "s-20", sizeLabel: "30", quantity: 12, reorderLevel: 5, status: "OK" },
  { id: "se-18", productId: "prod-12", productName: "Puma Slim Pants", sku: "PM-SP-001", categoryName: "Pants", brandName: "Puma", sizeId: "s-21", sizeLabel: "32", quantity: 15, reorderLevel: 5, status: "OK" },
  // Adidas Sport Shorts
  { id: "se-19", productId: "prod-10", productName: "Adidas Sport Shorts", sku: "AD-SS-001", categoryName: "Shorts", brandName: "Adidas", sizeId: "s-36", sizeLabel: "S", quantity: 15, reorderLevel: 5, status: "OK" },
  { id: "se-20", productId: "prod-10", productName: "Adidas Sport Shorts", sku: "AD-SS-001", categoryName: "Shorts", brandName: "Adidas", sizeId: "s-37", sizeLabel: "M", quantity: 25, reorderLevel: 5, status: "OK" },
];

const movements: MockStockMovement[] = [
  { id: "mv-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", sizeLabel: "M", type: "IN", quantity: 10, reason: "PO #001 received", userName: "Admin User", createdAt: "2025-01-15T10:30:00Z" },
  { id: "mv-2", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", sizeLabel: "32", type: "SALE", quantity: 2, reason: null, userName: "Staff Member", createdAt: "2025-01-14T14:20:00Z" },
  { id: "mv-3", productName: "Allen Solly Formal Shirt", sku: "AS-FS-001", sizeLabel: "L", type: "ADJUSTMENT", quantity: -3, reason: "Damaged items removed", userName: "Admin User", createdAt: "2025-01-13T09:15:00Z" },
  { id: "mv-4", productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001", sizeLabel: "S", type: "IN", quantity: 20, reason: "Restocked from warehouse", userName: "Admin User", createdAt: "2025-01-12T16:45:00Z" },
  { id: "mv-5", productName: "Puma Slim Pants", sku: "PM-SP-001", sizeLabel: "30", type: "SALE", quantity: 1, reason: null, userName: "Staff Member", createdAt: "2025-01-11T11:00:00Z" },
  { id: "mv-6", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", sizeLabel: "XL", type: "RETURN", quantity: 1, reason: "Customer return - wrong size", userName: "Staff Member", createdAt: "2025-01-10T15:30:00Z" },
  { id: "mv-7", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", sizeLabel: "28", type: "ADJUSTMENT", quantity: -5, reason: "Stock count correction", userName: "Admin User", createdAt: "2025-01-09T08:00:00Z" },
  { id: "mv-8", productName: "Adidas Sport Shorts", sku: "AD-SS-001", sizeLabel: "M", type: "IN", quantity: 15, reason: "PO #002 received", userName: "Admin User", createdAt: "2025-01-08T12:00:00Z" },
];

let nextMvId = 9;

export type StockListFilters = {
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
};

export const mockStockService = {
  async getStockLevels(filters?: StockListFilters): Promise<MockStockRow[]> {
    let result = [...stockRows];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (r) => r.productName.toLowerCase().includes(s) || r.sku.toLowerCase().includes(s)
      );
    }
    if (filters?.outOfStockOnly) {
      result = result.filter((r) => r.status === "OUT");
    } else if (filters?.lowStockOnly) {
      result = result.filter((r) => r.status === "LOW" || r.status === "OUT");
    }
    return result;
  },

  async adjustStock(input: MockAdjustInput): Promise<MockStockRow | null> {
    const row = stockRows.find(
      (r) => r.productId === input.productId && r.sizeId === input.sizeId
    );
    if (!row) return null;

    if (input.type === "IN") {
      row.quantity += Math.abs(input.quantity);
    } else if (input.type === "OUT") {
      row.quantity = Math.max(0, row.quantity - Math.abs(input.quantity));
    } else {
      row.quantity = Math.max(0, row.quantity + input.quantity);
    }

    row.status = row.quantity === 0 ? "OUT" : row.quantity <= row.reorderLevel ? "LOW" : "OK";

    // Add movement record
    movements.unshift({
      id: `mv-${nextMvId++}`,
      productName: row.productName,
      sku: row.sku,
      sizeLabel: row.sizeLabel,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason ?? null,
      userName: "Admin User",
      createdAt: new Date().toISOString(),
    });

    return row;
  },

  async getMovements(): Promise<MockStockMovement[]> {
    return [...movements];
  },
};
