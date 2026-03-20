import type { PurchaseOrder, POFormValues, POListFilters, POItem, ReceiveItemInput } from "../types";

// TODO: Replace with Prisma queries when DB is connected
// On receive, this should call stockService.adjustStock() per item with type: 'IN', referenceType: 'PO'

let purchaseOrders: PurchaseOrder[] = [
  {
    id: "po-1", storeId: "store-1", supplierId: "sup-1", supplierName: "FashionHub Wholesale",
    status: "RECEIVED", totalAmount: 45000, notes: "Monthly restock order",
    orderedAt: "2025-01-15T00:00:00Z", receivedAt: "2025-01-20T00:00:00Z",
    createdBy: "user-1", createdByName: "Admin User",
    items: [
      { id: "poi-1", productId: "prod-2", productName: "Adidas Classic Round Neck Tee", productSku: "AD-RN-001", sizeId: "s-3", sizeLabel: "M", quantity: 30, unitCost: 550, total: 16500 },
      { id: "poi-2", productId: "prod-3", productName: "Puma Polo T-Shirt", productSku: "PM-PT-001", sizeId: "s-4", sizeLabel: "L", quantity: 20, unitCost: 750, total: 15000 },
      { id: "poi-3", productId: "prod-6", productName: "Allen Solly Formal Shirt", productSku: "AS-FS-001", sizeId: "s-8", sizeLabel: "M", quantity: 15, unitCost: 900, total: 13500 },
    ],
    itemCount: 3, createdAt: "2025-01-10T00:00:00Z", updatedAt: "2025-01-20T00:00:00Z",
  },
  {
    id: "po-2", storeId: "store-1", supplierId: "sup-3", supplierName: "DenimWorld Pvt Ltd",
    status: "ORDERED", totalAmount: 39000, notes: "Jeans restock",
    orderedAt: "2025-02-01T00:00:00Z", receivedAt: null,
    createdBy: "user-1", createdByName: "Admin User",
    items: [
      { id: "poi-4", productId: "prod-4", productName: "Levi's 511 Slim Fit Jeans", productSku: "LV-511-001", sizeId: "s-13", sizeLabel: "30", quantity: 10, unitCost: 1800, total: 18000 },
      { id: "poi-5", productId: "prod-5", productName: "Levi's 501 Regular Fit Jeans", productSku: "LV-501-001", sizeId: "s-14", sizeLabel: "32", quantity: 10, unitCost: 2100, total: 21000 },
    ],
    itemCount: 2, createdAt: "2025-01-28T00:00:00Z", updatedAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "po-3", storeId: "store-1", supplierId: "sup-2", supplierName: "ActiveWear Distributors",
    status: "DRAFT", totalAmount: 24000, notes: null,
    orderedAt: null, receivedAt: null,
    createdBy: "user-1", createdByName: "Admin User",
    items: [
      { id: "poi-6", productId: "prod-1", productName: "Nike Dri-FIT Running Tee", productSku: "NK-DFT-001", sizeId: "s-27", sizeLabel: "M", quantity: 20, unitCost: 900, total: 18000 },
      { id: "poi-7", productId: "prod-10", productName: "Adidas Sport Shorts", productSku: "AD-SS-001", sizeId: "s-37", sizeLabel: "M", quantity: 12, unitCost: 500, total: 6000 },
    ],
    itemCount: 2, createdAt: "2025-02-10T00:00:00Z", updatedAt: "2025-02-10T00:00:00Z",
  },
  {
    id: "po-4", storeId: "store-1", supplierId: "sup-1", supplierName: "FashionHub Wholesale",
    status: "CANCELLED", totalAmount: 12000, notes: "Cancelled - supplier out of stock",
    orderedAt: "2025-01-25T00:00:00Z", receivedAt: null,
    createdBy: "user-1", createdByName: "Admin User",
    items: [
      { id: "poi-8", productId: "prod-7", productName: "Allen Solly Checked Casual Shirt", productSku: "AS-CS-001", sizeId: "s-8", sizeLabel: "M", quantity: 15, unitCost: 800, total: 12000 },
    ],
    itemCount: 1, createdAt: "2025-01-22T00:00:00Z", updatedAt: "2025-01-26T00:00:00Z",
  },
  {
    id: "po-5", storeId: "store-1", supplierId: "sup-2", supplierName: "ActiveWear Distributors",
    status: "RECEIVED", totalAmount: 30000, notes: "Sports collection restock",
    orderedAt: "2025-02-05T00:00:00Z", receivedAt: "2025-02-12T00:00:00Z",
    createdBy: "user-1", createdByName: "Admin User",
    items: [
      { id: "poi-9", productId: "prod-8", productName: "Nike Dri-FIT Joggers", productSku: "NK-JG-001", sizeId: "s-32", sizeLabel: "M", quantity: 15, unitCost: 1200, total: 18000 },
      { id: "poi-10", productId: "prod-9", productName: "Puma Cotton Track Pants", productSku: "PM-TP-001", sizeId: "s-33", sizeLabel: "L", quantity: 15, unitCost: 800, total: 12000 },
    ],
    itemCount: 2, createdAt: "2025-02-02T00:00:00Z", updatedAt: "2025-02-12T00:00:00Z",
  },
];

let nextPoId = 6;
let nextPoiId = 11;

export const poService = {
  async list(filters?: POListFilters): Promise<PurchaseOrder[]> {
    let result = [...purchaseOrders];

    if (filters?.supplierId) {
      result = result.filter((po) => po.supplierId === filters.supplierId);
    }
    if (filters?.status) {
      result = result.filter((po) => po.status === filters.status);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getById(id: string): Promise<PurchaseOrder | null> {
    return purchaseOrders.find((po) => po.id === id) ?? null;
  },

  async create(values: POFormValues, userId: string, userName: string): Promise<PurchaseOrder> {
    const now = new Date().toISOString();
    // Look up supplier name from existing POs or use a placeholder
    const supplierName = purchaseOrders.find((po) => po.supplierId === values.supplierId)?.supplierName ?? "Unknown Supplier";

    const items: POItem[] = values.items.map((item) => ({
      id: `poi-${nextPoiId++}`,
      productId: item.productId,
      productName: `Product ${item.productId}`, // In real impl, look up from DB
      productSku: `SKU-${item.productId}`,
      sizeId: item.sizeId,
      sizeLabel: `Size-${item.sizeId}`,
      quantity: item.quantity,
      unitCost: item.unitCost,
      total: item.quantity * item.unitCost,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    const po: PurchaseOrder = {
      id: `po-${nextPoId++}`,
      storeId: values.storeId,
      supplierId: values.supplierId,
      supplierName,
      status: "DRAFT",
      totalAmount,
      notes: values.notes ?? null,
      orderedAt: null,
      receivedAt: null,
      createdBy: userId,
      createdByName: userName,
      items,
      itemCount: items.length,
      createdAt: now,
      updatedAt: now,
    };
    purchaseOrders.push(po);
    return po;
  },

  async submitPO(id: string): Promise<PurchaseOrder | null> {
    const idx = purchaseOrders.findIndex((po) => po.id === id);
    if (idx === -1) return null;
    if (purchaseOrders[idx].status !== "DRAFT") {
      throw new Error("Only DRAFT purchase orders can be submitted");
    }
    const now = new Date().toISOString();
    purchaseOrders[idx] = {
      ...purchaseOrders[idx],
      status: "ORDERED",
      orderedAt: now,
      updatedAt: now,
    };
    return purchaseOrders[idx];
  },

  async receivePO(id: string, receivedItems: ReceiveItemInput[]): Promise<PurchaseOrder | null> {
    const idx = purchaseOrders.findIndex((po) => po.id === id);
    if (idx === -1) return null;
    if (purchaseOrders[idx].status !== "ORDERED") {
      throw new Error("Only ORDERED purchase orders can be received");
    }

    // In real implementation, loop through receivedItems and call:
    // stockService.adjustStock({ productId, sizeId, storeId, quantity: receivedQty, type: 'IN', referenceType: 'PO', referenceId: id, userId })
    // For mock, just update status

    const now = new Date().toISOString();
    purchaseOrders[idx] = {
      ...purchaseOrders[idx],
      status: "RECEIVED",
      receivedAt: now,
      updatedAt: now,
    };
    return purchaseOrders[idx];
  },

  async cancelPO(id: string): Promise<PurchaseOrder | null> {
    const idx = purchaseOrders.findIndex((po) => po.id === id);
    if (idx === -1) return null;
    if (purchaseOrders[idx].status === "RECEIVED") {
      throw new Error("Cannot cancel a received purchase order");
    }
    purchaseOrders[idx] = {
      ...purchaseOrders[idx],
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    };
    return purchaseOrders[idx];
  },

  async update(id: string, values: Partial<POFormValues>): Promise<PurchaseOrder | null> {
    const idx = purchaseOrders.findIndex((po) => po.id === id);
    if (idx === -1) return null;
    if (purchaseOrders[idx].status !== "DRAFT") {
      throw new Error("Only DRAFT purchase orders can be edited");
    }

    const existing = purchaseOrders[idx];
    let items = existing.items;
    let totalAmount = existing.totalAmount;

    if (values.items) {
      items = values.items.map((item) => ({
        id: `poi-${nextPoiId++}`,
        productId: item.productId,
        productName: `Product ${item.productId}`,
        productSku: `SKU-${item.productId}`,
        sizeId: item.sizeId,
        sizeLabel: `Size-${item.sizeId}`,
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
      }));
      totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    }

    purchaseOrders[idx] = {
      ...existing,
      supplierId: values.supplierId ?? existing.supplierId,
      notes: values.notes !== undefined ? (values.notes ?? null) : existing.notes,
      items,
      itemCount: items.length,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };
    return purchaseOrders[idx];
  },
};
