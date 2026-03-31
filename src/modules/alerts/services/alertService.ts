import { mockStockService } from "@/modules/stock/services/mockStockService";
import type { AlertConfig, AlertConfigFormValues, LowStockItem } from "../types";

// TODO: Replace with Prisma queries when DB is connected

let alertConfigs: AlertConfig[] = [
  {
    id: "ac-1",
    storeId: null,
    productId: null,
    productName: null,
    categoryId: null,
    categoryName: null,
    threshold: 5,
    notifyEmail: true,
    notifySMS: false,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ac-2",
    storeId: null,
    productId: "prod-4",
    productName: "Levi's 511 Slim Fit Jeans",
    categoryId: null,
    categoryName: null,
    threshold: 8,
    notifyEmail: true,
    notifySMS: true,
    isActive: true,
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "ac-3",
    storeId: null,
    productId: null,
    productName: null,
    categoryId: "cat-3",
    categoryName: "Jeans",
    threshold: 10,
    notifyEmail: true,
    notifySMS: false,
    isActive: false,
    createdAt: "2025-01-03T00:00:00Z",
    updatedAt: "2025-01-03T00:00:00Z",
  },
];

let nextId = 4;

export const alertService = {
  async list(): Promise<AlertConfig[]> {
    return [...alertConfigs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<AlertConfig | null> {
    return alertConfigs.find((c) => c.id === id) ?? null;
  },

  async create(values: AlertConfigFormValues): Promise<AlertConfig> {
    const now = new Date().toISOString();
    const config: AlertConfig = {
      id: `ac-${nextId++}`,
      storeId: null,
      productId: values.productId ?? null,
      productName: values.productId ? `Product ${values.productId}` : null,
      categoryId: values.categoryId ?? null,
      categoryName: values.categoryId ? `Category ${values.categoryId}` : null,
      threshold: values.threshold,
      notifyEmail: values.notifyEmail,
      notifySMS: values.notifySMS,
      isActive: values.isActive,
      createdAt: now,
      updatedAt: now,
    };
    alertConfigs.push(config);
    return config;
  },

  async update(id: string, values: Partial<AlertConfigFormValues>): Promise<AlertConfig | null> {
    const idx = alertConfigs.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const existing = alertConfigs[idx];
    const updated: AlertConfig = {
      ...existing,
      threshold: values.threshold ?? existing.threshold,
      notifyEmail: values.notifyEmail ?? existing.notifyEmail,
      notifySMS: values.notifySMS ?? existing.notifySMS,
      isActive: values.isActive ?? existing.isActive,
      productId: values.productId !== undefined ? (values.productId ?? null) : existing.productId,
      productName:
        values.productId !== undefined
          ? values.productId
            ? `Product ${values.productId}`
            : null
          : existing.productName,
      categoryId: values.categoryId !== undefined ? (values.categoryId ?? null) : existing.categoryId,
      categoryName:
        values.categoryId !== undefined
          ? values.categoryId
            ? `Category ${values.categoryId}`
            : null
          : existing.categoryName,
      updatedAt: new Date().toISOString(),
    };
    alertConfigs[idx] = updated;
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const idx = alertConfigs.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    alertConfigs.splice(idx, 1);
    return true;
  },

  /**
   * Check current stock levels against alert configs and return items below threshold.
   * The logic: for each active config, find stock rows that match (product or category or global)
   * and where quantity <= threshold.
   */
  async checkStockLevels(orgId: string): Promise<LowStockItem[]> {
    const activeConfigs = alertConfigs.filter((c) => c.isActive);
    if (activeConfigs.length === 0) return [];

    const allStock = await mockStockService.getStockLevels(orgId);
    const lowStockMap = new Map<string, LowStockItem>();

    for (const config of activeConfigs) {
      for (const row of allStock) {
        // Check if config applies to this stock row
        const matchesProduct = config.productId ? config.productId === row.productId : true;
        const matchesCategory = config.categoryId
          ? config.categoryName?.toLowerCase() === row.categoryName.toLowerCase()
          : true;

        if (matchesProduct && matchesCategory && row.quantity <= config.threshold) {
          // Use sizeId as unique key to avoid duplicates
          if (!lowStockMap.has(row.id)) {
            lowStockMap.set(row.id, {
              id: row.id,
              productId: row.productId,
              productName: row.productName,
              sku: row.sku,
              categoryName: row.categoryName,
              brandName: row.brandName,
              sizeLabel: row.sizeLabel,
              quantity: row.quantity,
              reorderLevel: row.reorderLevel,
              deficit: config.threshold - row.quantity,
            });
          }
        }
      }
    }

    return Array.from(lowStockMap.values()).sort((a, b) => a.quantity - b.quantity);
  },

  /**
   * Simulate sending alert notifications.
   * In production: Resend email + Twilio SMS.
   */
  async sendAlerts(items: LowStockItem[]): Promise<{ emailSent: boolean; smsSent: boolean; itemCount: number }> {
    if (items.length === 0) {
      return { emailSent: false, smsSent: false, itemCount: 0 };
    }

    const hasEmailConfig = alertConfigs.some((c) => c.isActive && c.notifyEmail);
    const hasSmsConfig = alertConfigs.some((c) => c.isActive && c.notifySMS);

    // TODO: Replace with actual Resend email + Twilio SMS when integrations are added
    console.log(`[AlertService] ${items.length} low-stock items detected:`);
    items.forEach((item) => {
      console.log(
        `  - ${item.productName} (${item.sizeLabel}): ${item.quantity} in stock, threshold deficit: ${item.deficit}`
      );
    });

    if (hasEmailConfig) {
      console.log("[AlertService] Email notification sent (simulated)");
    }
    if (hasSmsConfig) {
      console.log("[AlertService] SMS notification sent (simulated)");
    }

    return {
      emailSent: hasEmailConfig,
      smsSent: hasSmsConfig,
      itemCount: items.length,
    };
  },
};
