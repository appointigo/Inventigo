import "server-only";
import rawCatalog from "@/config/marketing/pricing.catalog.json";
import { pricingCatalogSchema, toPublicPricingCatalog, type PricingCatalog, type PublicPricingCatalog } from "./pricingCatalog";

let cached: PricingCatalog | undefined;
export async function getPricingCatalog(): Promise<PricingCatalog> {
  // Single data-source boundary: a future API adapter can replace this local read.
  cached ??= pricingCatalogSchema.parse(rawCatalog);
  return cached;
}
export async function getPublicPricingCatalog(): Promise<PublicPricingCatalog> {
  const catalog = await getPricingCatalog();
  const preview = process.env.NODE_ENV !== "production" && catalog.presentation.draftPreviewEnabled;
  return toPublicPricingCatalog(catalog, preview);
}
