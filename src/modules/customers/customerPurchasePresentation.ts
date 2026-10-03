import type { CustomerSaleSummaryDto } from "./types";

export type PurchaseItem = CustomerSaleSummaryDto["items"][number];

export const formatPurchaseItem = (item: PurchaseItem) =>
  `${item.name}${item.size ? ` (${item.size})` : ""} ×${item.quantity}`;

export const getAdditionalItemCount = (items: PurchaseItem[]) => Math.max(0, items.length - 1);
