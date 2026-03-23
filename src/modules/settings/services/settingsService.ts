import type { AppSettings, BillingConfig } from "../types";

// TODO: Replace with Prisma queries when DB is connected
let settings: AppSettings = {
  billingConfig: {
    taxRate: 18,
    invoicePrefix: "INV",
  },
};

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return { ...settings, billingConfig: { ...settings.billingConfig } };
  },

  async updateBillingConfig(input: Partial<BillingConfig>): Promise<AppSettings> {
    settings = {
      ...settings,
      billingConfig: { ...settings.billingConfig, ...input },
    };
    return { ...settings, billingConfig: { ...settings.billingConfig } };
  },
};
