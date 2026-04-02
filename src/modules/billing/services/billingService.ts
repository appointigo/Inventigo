import type {
  CreateSaleInput,
  Sale,
  SaleItem,
  SaleFilters,
  SaleSummary,
} from "../types";

// Mock sales data
const sales: Sale[] = [
  {
    id: "sale-1",
    invoiceNumber: "INV-20250115-0001",
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    subtotal: 4498,
    discountAmount: 200,
    taxAmount: 0,
    total: 4298,
    paymentMethod: "UPI",
    status: "COMPLETED",
    items: [
      { id: "si-1", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", sizeId: "s-27", sizeLabel: "M", quantity: 2, unitPrice: 1499, total: 2998 },
      { id: "si-2", productId: "prod-3", productName: "Puma Polo T-Shirt", sku: "PM-PT-001", sizeId: "s-3", sizeLabel: "M", quantity: 1, unitPrice: 1299, total: 1299 },
    ],
    createdAt: "2025-01-15T14:30:00Z",
  },
  {
    id: "sale-2",
    invoiceNumber: "INV-20250114-0001",
    customerName: null,
    customerPhone: null,
    subtotal: 2999,
    discountAmount: 0,
    taxAmount: 0,
    total: 2999,
    paymentMethod: "CASH",
    status: "COMPLETED",
    items: [
      { id: "si-3", productId: "prod-4", productName: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", sizeId: "s-14", sizeLabel: "32", quantity: 1, unitPrice: 2999, total: 2999 },
    ],
    createdAt: "2025-01-14T11:00:00Z",
  },
  {
    id: "sale-3",
    invoiceNumber: "INV-20250113-0001",
    customerName: "Priya Patel",
    customerPhone: "9876543211",
    subtotal: 3598,
    discountAmount: 300,
    taxAmount: 0,
    total: 3298,
    paymentMethod: "CARD",
    status: "REFUNDED",
    items: [
      { id: "si-4", productId: "prod-6", productName: "Allen Solly Formal Shirt", sku: "AS-FS-001", sizeId: "s-8", sizeLabel: "M", quantity: 1, unitPrice: 1799, total: 1799 },
      { id: "si-5", productId: "prod-7", productName: "Allen Solly Checked Casual Shirt", sku: "AS-CS-001", sizeId: "s-7", sizeLabel: "S", quantity: 1, unitPrice: 1599, total: 1599 },
    ],
    createdAt: "2025-01-13T16:45:00Z",
  },
  {
    id: "sale-4",
    invoiceNumber: "INV-20250112-0001",
    customerName: "Amit Kumar",
    customerPhone: null,
    subtotal: 1999,
    discountAmount: 0,
    taxAmount: 0,
    total: 1999,
    paymentMethod: "UPI",
    status: "COMPLETED",
    items: [
      { id: "si-6", productId: "prod-8", productName: "Nike Dri-FIT Joggers", sku: "NK-JG-001", sizeId: "s-32", sizeLabel: "M", quantity: 1, unitPrice: 1999, total: 1999 },
    ],
    createdAt: "2025-01-12T10:15:00Z",
  },
  {
    id: "sale-5",
    invoiceNumber: "INV-20250111-0001",
    customerName: null,
    customerPhone: null,
    subtotal: 1798,
    discountAmount: 100,
    taxAmount: 0,
    total: 1698,
    paymentMethod: "CASH",
    status: "COMPLETED",
    items: [
      { id: "si-7", productId: "prod-10", productName: "Adidas Sport Shorts", sku: "AD-SS-001", sizeId: "s-37", sizeLabel: "M", quantity: 2, unitPrice: 899, total: 1798 },
    ],
    createdAt: "2025-01-11T15:30:00Z",
  },
];

let nextSaleId = 6;
let nextItemId = 8;
let invoiceSeq = 2;

const generateInvoiceNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(invoiceSeq++).padStart(4, "0");
  return `INV-${dateStr}-${seq}`;
};

export const billingService = {
  async createSale(orgId: string, input: CreateSaleInput): Promise<Sale> {
    const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = subtotal - input.discountAmount + input.taxAmount;

    const saleItems: SaleItem[] = input.items.map((item) => ({
      id: `si-${nextItemId++}`,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      sizeId: item.sizeId,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.unitPrice * item.quantity,
    }));

    const sale: Sale = {
      id: `sale-${nextSaleId++}`,
      invoiceNumber: generateInvoiceNumber(),
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      subtotal,
      discountAmount: input.discountAmount,
      taxAmount: input.taxAmount,
      total,
      paymentMethod: input.paymentMethod,
      status: "COMPLETED",
      items: saleItems,
      createdAt: new Date().toISOString(),
    };

    sales.unshift(sale);
    return sale;
  },

  async getSaleById(id: string): Promise<Sale | null> {
    return sales.find((s) => s.id === id) ?? null;
  },

  async getSales(filters?: SaleFilters): Promise<SaleSummary[]> {
    let result = [...sales];

    if (filters?.status) {
      result = result.filter((s) => s.status === filters.status);
    }
    if (filters?.paymentMethod) {
      result = result.filter((s) => s.paymentMethod === filters.paymentMethod);
    }
    if (filters?.startDate) {
      result = result.filter((s) => s.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      result = result.filter((s) => s.createdAt < end.toISOString());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(q) ||
          (s.customerName?.toLowerCase().includes(q) ?? false)
      );
    }

    return result.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: s.customerName,
      total: s.total,
      paymentMethod: s.paymentMethod,
      status: s.status,
      itemCount: s.items.length,
      createdAt: s.createdAt,
    }));
  },

  async refundSale(orgId: string, saleId: string): Promise<Sale | null> {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "REFUNDED") return null;

    sale.status = "REFUNDED";
    // TODO: Restore stock via stockService when billing is wired to real DB (Phase 8)
    return sale;
  },

  /** Sales KPIs for dashboard */
  async getSalesKPIs(): Promise<{ todaySales: number; todayRevenue: number; totalSales: number; totalRevenue: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const completedSales = sales.filter((s) => s.status === "COMPLETED");
    const todayCompleted = completedSales.filter((s) => s.createdAt.slice(0, 10) === today);

    return {
      todaySales: todayCompleted.length,
      todayRevenue: todayCompleted.reduce((sum, s) => sum + s.total, 0),
      totalSales: completedSales.length,
      totalRevenue: completedSales.reduce((sum, s) => sum + s.total, 0),
    };
  },
};
