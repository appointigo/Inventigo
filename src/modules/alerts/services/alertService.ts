import { prisma } from "@/lib/db";
import { stockService } from "@/modules/stock/services/stockService";
import type { AlertConfig, AlertConfigFormValues, LowStockItem } from "../types";

function mapConfig(
  raw: {
    id: string;
    orgId: string;
    storeId: string | null;
    productId: string | null;
    categoryId: string | null;
    threshold: number;
    notifyEmail: boolean;
    notifySMS: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    category: { name: string } | null;
  } & { product?: { name: string } | null }
): AlertConfig {
  return {
    id: raw.id,
    storeId: raw.storeId,
    productId: raw.productId,
    productName: raw.product?.name ?? null,
    categoryId: raw.categoryId,
    categoryName: raw.category?.name ?? null,
    threshold: raw.threshold,
    notifyEmail: raw.notifyEmail,
    notifySMS: raw.notifySMS,
    isActive: raw.isActive,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

const include = {
  category: { select: { name: true } },
  product: { select: { name: true } },
} as const;

export const alertService = {
  async list(orgId: string): Promise<AlertConfig[]> {
    const configs = await prisma.alertConfig.findMany({
      where: { orgId },
      include,
      orderBy: { createdAt: "desc" },
    });
    return configs.map(mapConfig);
  },

  async getById(id: string, orgId: string): Promise<AlertConfig | null> {
    const config = await prisma.alertConfig.findFirst({
      where: { id, orgId },
      include,
    });
    return config ? mapConfig(config) : null;
  },

  async create(orgId: string, values: AlertConfigFormValues): Promise<AlertConfig> {
    const config = await prisma.alertConfig.create({
      data: {
        orgId,
        productId: values.productId ?? null,
        categoryId: values.categoryId ?? null,
        threshold: values.threshold,
        notifyEmail: values.notifyEmail,
        notifySMS: values.notifySMS,
        isActive: values.isActive,
      },
      include,
    });
    return mapConfig(config);
  },

  async update(id: string, orgId: string, values: Partial<AlertConfigFormValues>): Promise<AlertConfig | null> {
    const existing = await prisma.alertConfig.findFirst({ where: { id, orgId } });
    if (!existing) return null;

    const config = await prisma.alertConfig.update({
      where: { id },
      data: {
        ...(values.threshold !== undefined && { threshold: values.threshold }),
        ...(values.notifyEmail !== undefined && { notifyEmail: values.notifyEmail }),
        ...(values.notifySMS !== undefined && { notifySMS: values.notifySMS }),
        ...(values.isActive !== undefined && { isActive: values.isActive }),
        ...(values.productId !== undefined && { productId: values.productId ?? null }),
        ...(values.categoryId !== undefined && { categoryId: values.categoryId ?? null }),
      },
      include,
    });
    return mapConfig(config);
  },

  async delete(id: string, orgId: string): Promise<boolean> {
    const existing = await prisma.alertConfig.findFirst({ where: { id, orgId } });
    if (!existing) return false;
    await prisma.alertConfig.delete({ where: { id } });
    return true;
  },

  async checkStockLevels(orgId: string): Promise<LowStockItem[]> {
    const activeConfigs = await prisma.alertConfig.findMany({
      where: { orgId, isActive: true },
      include: { category: { select: { name: true } } },
    });
    if (activeConfigs.length === 0) return [];

    // Aggregate stock across all stores in the org
    const stores = await prisma.store.findMany({ where: { orgId }, select: { id: true } });
    const lowStockMap = new Map<string, LowStockItem>();

    for (const store of stores) {
      const { items: allStock } = await stockService.getStockLevels({
        storeId: store.id,
        page: 1,
        pageSize: 10000,
      });

      for (const config of activeConfigs) {
        for (const row of allStock) {
          const matchesProduct = config.productId ? config.productId === row.productId : true;
          const categoryMatch = config.categoryId
            ? config.category?.name?.toLowerCase() === row.categoryName.toLowerCase()
            : true;

          if (matchesProduct && categoryMatch && row.quantity <= config.threshold) {
            const key = `${row.id}-${store.id}`;
            if (!lowStockMap.has(key)) {
              lowStockMap.set(key, {
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
    }

    return Array.from(lowStockMap.values()).sort((a, b) => a.quantity - b.quantity);
  },

  async sendAlerts(
    orgId: string,
    items: LowStockItem[]
  ): Promise<{ emailSent: boolean; smsSent: boolean; itemCount: number }> {
    if (items.length === 0) return { emailSent: false, smsSent: false, itemCount: 0 };

    const activeConfigs = await prisma.alertConfig.findMany({
      where: { orgId, isActive: true },
      select: { notifyEmail: true, notifySMS: true },
    });
    const hasEmailConfig = activeConfigs.some((c) => c.notifyEmail);
    const hasSmsConfig = activeConfigs.some((c) => c.notifySMS);

    // TODO: Replace with actual Resend email + Twilio SMS when integrations are added
    console.log(`[AlertService] ${items.length} low-stock items detected:`);
    items.forEach((item) => {
      console.log(
        `  - ${item.productName} (${item.sizeLabel}): ${item.quantity} in stock, deficit: ${item.deficit}`
      );
    });
    if (hasEmailConfig) console.log("[AlertService] Email notification sent (simulated)");
    if (hasSmsConfig) console.log("[AlertService] SMS notification sent (simulated)");

    return { emailSent: hasEmailConfig, smsSent: hasSmsConfig, itemCount: items.length };
  },
};
