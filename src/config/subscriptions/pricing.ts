/**
 * Provisional INR prices for the first catalog version. Change these values and
 * increment version to create a new draft; published prices and subscriptions
 * must never be edited in place. SaaS amounts are integer paise per organization.
 *
 * Benchmark: https://www.zoho.com/en-in/pos/retail/pricing.html
 * Stockiva's bundles/limits differ, so these are product assumptions, not a
 * claim that a competitor charges the same price.
 */
export const SUBSCRIPTION_CATALOG = {
  version: 1,
  currency: "INR",
  taxMode: "EXCLUSIVE" as const,
  plans: [
    {
      key: "starter",
      name: "Starter",
      description: "Everyday retail operations for one store.",
      monthlyPaise: 99_900,
      annualPaise: 999_000,
      features: {
        "pos.billing": true,
        "inventory.products": true,
        "analytics.overview": true,
        "stores.max": 1,
        "team.seats.max": 3,
      },
    },
    {
      key: "growth",
      name: "Growth",
      description: "Multi-store operations, purchasing and team workflows.",
      monthlyPaise: 249_900,
      annualPaise: 2_499_000,
      features: {
        "pos.billing": true,
        "inventory.products": true,
        "analytics.overview": true,
        "purchasing.orders": true,
        "inventory.transfers": true,
        "customers.followups": true,
        "expenses.manage": true,
        "stores.max": 3,
        "team.seats.max": 10,
      },
    },
    {
      key: "business",
      name: "Business",
      description: "Larger store and team allowances with the Growth workflows.",
      monthlyPaise: 499_900,
      annualPaise: 4_999_000,
      features: {
        "pos.billing": true,
        "inventory.products": true,
        "analytics.overview": true,
        "purchasing.orders": true,
        "inventory.transfers": true,
        "customers.followups": true,
        "expenses.manage": true,
        "stores.max": 10,
        "team.seats.max": 25,
      },
    },
  ],
} as const;

export const SUBSCRIPTION_FEATURES = [
  { key: "pos.billing", description: "Create retail sales", valueType: "BOOLEAN" },
  { key: "inventory.products", description: "Manage the product catalog", valueType: "BOOLEAN" },
  { key: "analytics.overview", description: "Read essential reporting", valueType: "BOOLEAN" },
  { key: "purchasing.orders", description: "Manage purchase orders", valueType: "BOOLEAN" },
  { key: "inventory.transfers", description: "Transfer stock between stores", valueType: "BOOLEAN" },
  { key: "customers.followups", description: "Manage customer follow-ups", valueType: "BOOLEAN" },
  { key: "expenses.manage", description: "Manage store expenses", valueType: "BOOLEAN" },
  { key: "stores.max", description: "Maximum active stores", valueType: "INTEGER" },
  { key: "team.seats.max", description: "Maximum active users", valueType: "INTEGER" },
] as const;
