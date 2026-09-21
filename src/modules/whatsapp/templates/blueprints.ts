import type {
  WhatsAppTemplateCategory,
  WhatsAppTemplatePurpose,
} from "@prisma/client";
import { invoiceV1Definition } from "./invoiceV1.ts";

export type StockivaTemplateVariable = {
  position: number;
  key: string;
  example: string;
};

export type StockivaTemplateBlueprint = {
  id: string;
  key: string;
  displayLabel: string;
  description: string;
  version: number;
  language: string;
  category: WhatsAppTemplateCategory;
  purpose: WhatsAppTemplatePurpose;
  body: string;
  footer?: string;
  variables: readonly StockivaTemplateVariable[];
  namePattern: string;
  creationPolicy: "AUTO_RECONCILE" | "MERCHANT_SELECTED";
};

export const invoiceV1Blueprint: StockivaTemplateBlueprint = {
  id: invoiceV1Definition.id,
  key: invoiceV1Definition.key,
  displayLabel: invoiceV1Definition.displayLabel,
  description: "Stockiva invoice notification",
  version: invoiceV1Definition.version,
  language: invoiceV1Definition.language,
  category: invoiceV1Definition.category,
  purpose: invoiceV1Definition.purpose,
  body: invoiceV1Definition.body,
  footer: invoiceV1Definition.footer,
  variables: invoiceV1Definition.variables,
  namePattern: invoiceV1Definition.name,
  creationPolicy: "AUTO_RECONCILE",
};

export const merchantMarketingBlueprints: readonly StockivaTemplateBlueprint[] = [
  {
    id: "festival_offer_v1",
    key: "festival_offer_v1",
    displayLabel: "Festival Offer",
    description: "Promote a seasonal or festival sale with an expiry date.",
    version: 1,
    language: "en_US",
    category: "MARKETING",
    purpose: "MARKETING_PROMOTION",
    body: "Hi {{1}}, our {{2}} offer is live at {{3}}. Enjoy {{4}} until {{5}}.",
    footer: "Reply STOP to opt out.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 2, key: "campaignName", example: "Festival Sale" },
      { position: 3, key: "storeName", example: "Rare Thread" },
      { position: 4, key: "offer", example: "20% off" },
      { position: 5, key: "expiryDate", example: "31 October" },
    ],
    namePattern: "{merchant}_festival_offer_v1_en_us",
    creationPolicy: "MERCHANT_SELECTED",
  },
  {
    id: "percentage_discount_v1",
    key: "percentage_discount_v1",
    displayLabel: "Percentage Discount",
    description: "Announce a percentage discount and its validity window.",
    version: 1,
    language: "en_US",
    category: "MARKETING",
    purpose: "COUPON",
    body: "Hi {{1}}, get {{2}} off at {{3}} with code {{4}} until {{5}}.",
    footer: "Terms apply. Reply STOP to opt out.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 2, key: "discount", example: "20%" },
      { position: 3, key: "storeName", example: "Rare Thread" },
      { position: 4, key: "couponCode", example: "SAVE20" },
      { position: 5, key: "expiryDate", example: "31 October" },
    ],
    namePattern: "{merchant}_percentage_discount_v1_en_us",
    creationPolicy: "MERCHANT_SELECTED",
  },
  {
    id: "new_arrival_v1",
    key: "new_arrival_v1",
    displayLabel: "New Arrival",
    description: "Introduce a new collection or product arrival.",
    version: 1,
    language: "en_US",
    category: "MARKETING",
    purpose: "PRODUCT_LAUNCH",
    body: "Hi {{1}}, the new {{2}} collection has arrived at {{3}}. Visit us to explore it.",
    footer: "Reply STOP to opt out.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 2, key: "collectionName", example: "Autumn" },
      { position: 3, key: "storeName", example: "Rare Thread" },
    ],
    namePattern: "{merchant}_new_arrival_v1_en_us",
    creationPolicy: "MERCHANT_SELECTED",
  },
  {
    id: "back_in_stock_v1",
    key: "back_in_stock_v1",
    displayLabel: "Back in Stock",
    description: "Notify customers that a requested product is available again.",
    version: 1,
    language: "en_US",
    category: "MARKETING",
    purpose: "CUSTOM",
    body: "Hi {{1}}, {{2}} is back in stock at {{3}}. Available while supplies last.",
    footer: "Reply STOP to opt out.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 2, key: "productName", example: "Classic Linen Shirt" },
      { position: 3, key: "storeName", example: "Rare Thread" },
    ],
    namePattern: "{merchant}_back_in_stock_v1_en_us",
    creationPolicy: "MERCHANT_SELECTED",
  },
  {
    id: "store_announcement_v1",
    key: "store_announcement_v1",
    displayLabel: "Store Announcement",
    description: "Share a concise store update or event announcement.",
    version: 1,
    language: "en_US",
    category: "MARKETING",
    purpose: "CUSTOM",
    body: "Hi {{1}}, an update from {{2}}: {{3}}.",
    footer: "Reply STOP to opt out.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 2, key: "storeName", example: "Rare Thread" },
      { position: 3, key: "announcement", example: "We are open this Sunday" },
    ],
    namePattern: "{merchant}_store_announcement_v1_en_us",
    creationPolicy: "MERCHANT_SELECTED",
  },
] as const;

export const stockivaTemplateBlueprints: readonly StockivaTemplateBlueprint[] = [
  invoiceV1Blueprint,
  ...merchantMarketingBlueprints,
];

export function getStockivaTemplateBlueprint(id: string) {
  return stockivaTemplateBlueprints.find(blueprint => blueprint.id === id);
}
