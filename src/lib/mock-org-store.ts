/**
 * Central org-scoped mock data store.
 *
 * Each entry is keyed by orgId. When the app runs with test credentials the
 * orgIds are the fixed strings used in auth.ts ("test-org-001", null for
 * SUPER_ADMIN). When a user registers via /api/auth/register in demo mode
 * their generated orgId is used — the first time a service is called for that
 * orgId the data is seeded from the defaults below.
 *
 * SUPER_ADMIN (orgId = null) has no catalog data of its own: the platform
 * admin section queries a summary across all orgs instead.
 *
 * TODO: Remove when Prisma DB connection is live.
 */

import type { Brand } from "@/modules/brands/types";
import type { Category } from "@/modules/categories/types";
import type { Product } from "@/modules/products/types";
import { MockStockMovement, MockStockRow } from "@/modules/stock/services/mockStockService";

// ─── Default seed data (mirrors what seed.ts puts in the DB) ─────────────────

export const DEFAULT_BRANDS: Omit<Brand, never>[] = [
  { id: "br-1", name: "Nike",         logoUrl: null, isActive: true, productCount: 4, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-2", name: "Adidas",       logoUrl: null, isActive: true, productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-3", name: "Puma",         logoUrl: null, isActive: true, productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-4", name: "Levi's",       logoUrl: null, isActive: true, productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-5", name: "Allen Solly",  logoUrl: null, isActive: true, productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-1", name: "T-Shirts", slug: "t-shirts",
    description: "Casual t-shirts for men and women",
    attributeSchema: { fields: [
      { name: "sleeve",   type: "select", options: ["Half Sleeve","Full Sleeve","Sleeveless"], required: true },
      { name: "neckType", type: "select", options: ["Round Neck","V-Neck","Polo","Crew Neck"],  required: true },
      { name: "color",    type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-1", label: "XS", sortOrder: 0 }, { id: "s-2",  label: "S",   sortOrder: 1 },
      { id: "s-3", label: "M",  sortOrder: 2 }, { id: "s-4",  label: "L",   sortOrder: 3 },
      { id: "s-5", label: "XL", sortOrder: 4 }, { id: "s-6",  label: "XXL", sortOrder: 5 },
    ],
    productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-2", name: "Shirts", slug: "shirts",
    description: "Formal and casual shirts",
    attributeSchema: { fields: [
      { name: "sleeve",  type: "select", options: ["Half Sleeve","Full Sleeve"], required: true },
      { name: "fit",     type: "select", options: ["Slim Fit","Regular Fit","Relaxed Fit"], required: true },
      { name: "pattern", type: "select", options: ["Solid","Striped","Checked","Printed"], required: false },
      { name: "color",   type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-7", label: "S", sortOrder: 0 }, { id: "s-8",  label: "M",   sortOrder: 1 },
      { id: "s-9", label: "L", sortOrder: 2 }, { id: "s-10", label: "XL",  sortOrder: 3 },
      { id: "s-11", label: "XXL", sortOrder: 4 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-3", name: "Jeans", slug: "jeans",
    description: "Denim jeans in various fits",
    attributeSchema: { fields: [
      { name: "fit",   type: "select", options: ["Slim","Regular","Relaxed","Skinny","Bootcut"], required: true },
      { name: "rise",  type: "select", options: ["Low Rise","Mid Rise","High Rise"],             required: false },
      { name: "wash",  type: "select", options: ["Light","Medium","Dark","Black"],               required: true },
      { name: "color", type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-12", label: "28", sortOrder: 0 }, { id: "s-13", label: "30", sortOrder: 1 },
      { id: "s-14", label: "32", sortOrder: 2 }, { id: "s-15", label: "34", sortOrder: 3 },
      { id: "s-16", label: "36", sortOrder: 4 }, { id: "s-17", label: "38", sortOrder: 5 },
      { id: "s-18", label: "40", sortOrder: 6 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-4", name: "Pants", slug: "pants",
    description: "Formal and casual trousers",
    attributeSchema: { fields: [
      { name: "fit",      type: "select", options: ["Slim Fit","Regular Fit","Tapered"],            required: true  },
      { name: "material", type: "select", options: ["Cotton","Polyester","Linen","Blend"],          required: false },
      { name: "color",    type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-19", label: "28", sortOrder: 0 }, { id: "s-20", label: "30", sortOrder: 1 },
      { id: "s-21", label: "32", sortOrder: 2 }, { id: "s-22", label: "34", sortOrder: 3 },
      { id: "s-23", label: "36", sortOrder: 4 }, { id: "s-24", label: "38", sortOrder: 5 },
      { id: "s-25", label: "40", sortOrder: 6 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-5", name: "Dry-Fit T-Shirts", slug: "dry-fit-tshirts",
    description: "Moisture-wicking performance t-shirts",
    attributeSchema: { fields: [
      { name: "sleeve", type: "select", options: ["Half Sleeve","Full Sleeve","Sleeveless"], required: true  },
      { name: "sport",  type: "select", options: ["Running","Gym","Cricket","General"],      required: false },
      { name: "color",  type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-26", label: "S",   sortOrder: 0 }, { id: "s-27", label: "M",   sortOrder: 1 },
      { id: "s-28", label: "L",   sortOrder: 2 }, { id: "s-29", label: "XL",  sortOrder: 3 },
      { id: "s-30", label: "XXL", sortOrder: 4 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-6", name: "Lowers", slug: "lowers",
    description: "Track pants and joggers",
    attributeSchema: { fields: [
      { name: "type",     type: "select", options: ["Track Pants","Joggers","Sweatpants"],   required: true  },
      { name: "material", type: "select", options: ["Cotton","Polyester","Fleece","Blend"],  required: false },
      { name: "color",    type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-31", label: "S", sortOrder: 0 }, { id: "s-32", label: "M",   sortOrder: 1 },
      { id: "s-33", label: "L", sortOrder: 2 }, { id: "s-34", label: "XL",  sortOrder: 3 },
      { id: "s-35", label: "XXL", sortOrder: 4 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-7", name: "Shorts", slug: "shorts",
    description: "Casual and sports shorts",
    attributeSchema: { fields: [
      { name: "type",   type: "select", options: ["Casual","Sports","Cargo","Denim"],         required: true  },
      { name: "length", type: "select", options: ["Above Knee","Knee Length","Below Knee"],   required: false },
      { name: "color",  type: "text",   required: true },
    ]},
    sizes: [
      { id: "s-36", label: "S", sortOrder: 0 }, { id: "s-37", label: "M",  sortOrder: 1 },
      { id: "s-38", label: "L", sortOrder: 2 }, { id: "s-39", label: "XL", sortOrder: 3 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1", name: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001", externalBarcode: "8901030811649",
    categoryId: "cat-5", categoryName: "Dry-Fit T-Shirts", brandId: "br-1", brandName: "Nike",
    basePrice: 1499, costPrice: 900,
    attributes: { sleeve: "Half Sleeve", sport: "Running", color: "Black" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-26", sizeLabel: "S",   variantSku: "NK-DFT-001-S",   quantity: 15, reorderLevel: 5 },
      { sizeId: "s-27", sizeLabel: "M",   variantSku: "NK-DFT-001-M",   quantity: 25, reorderLevel: 5 },
      { sizeId: "s-28", sizeLabel: "L",   variantSku: "NK-DFT-001-L",   quantity: 20, reorderLevel: 5 },
      { sizeId: "s-29", sizeLabel: "XL",  variantSku: "NK-DFT-001-XL",  quantity: 10, reorderLevel: 5 },
      { sizeId: "s-30", sizeLabel: "XXL", variantSku: "NK-DFT-001-XXL", quantity:  5, reorderLevel: 5 },
    ],
    totalStock: 75, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-2", name: "Adidas Classic Round Neck Tee", sku: "AD-RN-001", externalBarcode: "4060477182940",
    categoryId: "cat-1", categoryName: "T-Shirts", brandId: "br-2", brandName: "Adidas",
    basePrice: 999, costPrice: 550,
    attributes: { sleeve: "Half Sleeve", neckType: "Round Neck", color: "White" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-2", sizeLabel: "S",   variantSku: null, quantity: 20, reorderLevel: 5 },
      { sizeId: "s-3", sizeLabel: "M",   variantSku: null, quantity: 30, reorderLevel: 5 },
      { sizeId: "s-4", sizeLabel: "L",   variantSku: null, quantity: 25, reorderLevel: 5 },
      { sizeId: "s-5", sizeLabel: "XL",  variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-6", sizeLabel: "XXL", variantSku: null, quantity:  8, reorderLevel: 5 },
    ],
    totalStock: 98, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-3", name: "Puma Polo T-Shirt", sku: "PM-PT-001", externalBarcode: null,
    categoryId: "cat-1", categoryName: "T-Shirts", brandId: "br-3", brandName: "Puma",
    basePrice: 1299, costPrice: 750,
    attributes: { sleeve: "Half Sleeve", neckType: "Polo", color: "Navy Blue" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-2", sizeLabel: "S",   variantSku: null, quantity: 10, reorderLevel: 5 },
      { sizeId: "s-3", sizeLabel: "M",   variantSku: null, quantity: 20, reorderLevel: 5 },
      { sizeId: "s-4", sizeLabel: "L",   variantSku: null, quantity: 18, reorderLevel: 5 },
      { sizeId: "s-5", sizeLabel: "XL",  variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-6", sizeLabel: "XXL", variantSku: null, quantity:  5, reorderLevel: 5 },
    ],
    totalStock: 65, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-4", name: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001", externalBarcode: null,
    categoryId: "cat-3", categoryName: "Jeans", brandId: "br-4", brandName: "Levi's",
    basePrice: 2999, costPrice: 1800,
    attributes: { fit: "Slim", rise: "Mid Rise", wash: "Dark", color: "Indigo" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-12", sizeLabel: "28", variantSku: null, quantity:  8, reorderLevel: 5 },
      { sizeId: "s-13", sizeLabel: "30", variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-14", sizeLabel: "32", variantSku: null, quantity: 20, reorderLevel: 5 },
      { sizeId: "s-15", sizeLabel: "34", variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-16", sizeLabel: "36", variantSku: null, quantity:  6, reorderLevel: 5 },
    ],
    totalStock: 61, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-5", name: "Levi's 501 Regular Fit Jeans", sku: "LV-501-001", externalBarcode: null,
    categoryId: "cat-3", categoryName: "Jeans", brandId: "br-4", brandName: "Levi's",
    basePrice: 3499, costPrice: 2100,
    attributes: { fit: "Regular", rise: "Mid Rise", wash: "Medium", color: "Blue" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-13", sizeLabel: "30", variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-14", sizeLabel: "32", variantSku: null, quantity: 18, reorderLevel: 5 },
      { sizeId: "s-15", sizeLabel: "34", variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-16", sizeLabel: "36", variantSku: null, quantity:  8, reorderLevel: 5 },
      { sizeId: "s-17", sizeLabel: "38", variantSku: null, quantity:  4, reorderLevel: 5 },
    ],
    totalStock: 57, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-6", name: "Allen Solly Formal Shirt", sku: "AS-FS-001", externalBarcode: null,
    categoryId: "cat-2", categoryName: "Shirts", brandId: "br-5", brandName: "Allen Solly",
    basePrice: 1799, costPrice: 1000,
    attributes: { sleeve: "Full Sleeve", fit: "Slim Fit", pattern: "Solid", color: "Sky Blue" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-7",  sizeLabel: "S",   variantSku: null, quantity: 10, reorderLevel: 5 },
      { sizeId: "s-8",  sizeLabel: "M",   variantSku: null, quantity: 20, reorderLevel: 5 },
      { sizeId: "s-9",  sizeLabel: "L",   variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-10", sizeLabel: "XL",  variantSku: null, quantity:  8, reorderLevel: 5 },
      { sizeId: "s-11", sizeLabel: "XXL", variantSku: null, quantity:  4, reorderLevel: 5 },
    ],
    totalStock: 57, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-7", name: "Allen Solly Checked Casual Shirt", sku: "AS-CS-001", externalBarcode: null,
    categoryId: "cat-2", categoryName: "Shirts", brandId: "br-5", brandName: "Allen Solly",
    basePrice: 1599, costPrice: 900,
    attributes: { sleeve: "Half Sleeve", fit: "Regular Fit", pattern: "Checked", color: "Red/White" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-7",  sizeLabel: "S",  variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-8",  sizeLabel: "M",  variantSku: null, quantity: 18, reorderLevel: 5 },
      { sizeId: "s-9",  sizeLabel: "L",  variantSku: null, quantity: 14, reorderLevel: 5 },
      { sizeId: "s-10", sizeLabel: "XL", variantSku: null, quantity: 10, reorderLevel: 5 },
    ],
    totalStock: 54, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-8", name: "Nike Dri-FIT Joggers", sku: "NK-JG-001", externalBarcode: null,
    categoryId: "cat-6", categoryName: "Lowers", brandId: "br-1", brandName: "Nike",
    basePrice: 1999, costPrice: 1200,
    attributes: { type: "Joggers", material: "Polyester", color: "Grey" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-31", sizeLabel: "S",  variantSku: null, quantity: 8,  reorderLevel: 5 },
      { sizeId: "s-32", sizeLabel: "M",  variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-33", sizeLabel: "L",  variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-34", sizeLabel: "XL", variantSku: null, quantity: 6,  reorderLevel: 5 },
    ],
    totalStock: 41, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-9", name: "Puma Cotton Track Pants", sku: "PM-TP-001", externalBarcode: null,
    categoryId: "cat-6", categoryName: "Lowers", brandId: "br-3", brandName: "Puma",
    basePrice: 1499, costPrice: 850,
    attributes: { type: "Track Pants", material: "Cotton", color: "Black" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-31", sizeLabel: "S",   variantSku: null, quantity: 10, reorderLevel: 5 },
      { sizeId: "s-32", sizeLabel: "M",   variantSku: null, quantity: 20, reorderLevel: 5 },
      { sizeId: "s-33", sizeLabel: "L",   variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-34", sizeLabel: "XL",  variantSku: null, quantity:  8, reorderLevel: 5 },
      { sizeId: "s-35", sizeLabel: "XXL", variantSku: null, quantity:  5, reorderLevel: 5 },
    ],
    totalStock: 58, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-10", name: "Adidas Sport Shorts", sku: "AD-SS-001", externalBarcode: null,
    categoryId: "cat-7", categoryName: "Shorts", brandId: "br-2", brandName: "Adidas",
    basePrice: 899, costPrice: 500,
    attributes: { type: "Sports", length: "Above Knee", color: "Black" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-36", sizeLabel: "S",  variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-37", sizeLabel: "M",  variantSku: null, quantity: 25, reorderLevel: 5 },
      { sizeId: "s-38", sizeLabel: "L",  variantSku: null, quantity: 20, reorderLevel: 5 },
      { sizeId: "s-39", sizeLabel: "XL", variantSku: null, quantity: 10, reorderLevel: 5 },
    ],
    totalStock: 70, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-11", name: "Nike Cargo Shorts", sku: "NK-CS-001", externalBarcode: null,
    categoryId: "cat-7", categoryName: "Shorts", brandId: "br-1", brandName: "Nike",
    basePrice: 1299, costPrice: 750,
    attributes: { type: "Cargo", length: "Knee Length", color: "Olive Green" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-36", sizeLabel: "S",  variantSku: null, quantity:  8, reorderLevel: 5 },
      { sizeId: "s-37", sizeLabel: "M",  variantSku: null, quantity: 14, reorderLevel: 5 },
      { sizeId: "s-38", sizeLabel: "L",  variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-39", sizeLabel: "XL", variantSku: null, quantity:  6, reorderLevel: 5 },
    ],
    totalStock: 40, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-12", name: "Puma Slim Pants", sku: "PM-SP-001", externalBarcode: null,
    categoryId: "cat-4", categoryName: "Pants", brandId: "br-3", brandName: "Puma",
    basePrice: 1799, costPrice: 1050,
    attributes: { fit: "Slim Fit", material: "Cotton", color: "Khaki" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-19", sizeLabel: "28", variantSku: null, quantity:  5, reorderLevel: 5 },
      { sizeId: "s-20", sizeLabel: "30", variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-21", sizeLabel: "32", variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-22", sizeLabel: "34", variantSku: null, quantity: 10, reorderLevel: 5 },
      { sizeId: "s-23", sizeLabel: "36", variantSku: null, quantity:  5, reorderLevel: 5 },
    ],
    totalStock: 47, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-13", name: "Allen Solly Formal Trousers", sku: "AS-FT-001", externalBarcode: null,
    categoryId: "cat-4", categoryName: "Pants", brandId: "br-5", brandName: "Allen Solly",
    basePrice: 2199, costPrice: 1300,
    attributes: { fit: "Regular Fit", material: "Polyester", color: "Charcoal" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-20", sizeLabel: "30", variantSku: null, quantity: 10, reorderLevel: 5 },
      { sizeId: "s-21", sizeLabel: "32", variantSku: null, quantity: 18, reorderLevel: 5 },
      { sizeId: "s-22", sizeLabel: "34", variantSku: null, quantity: 14, reorderLevel: 5 },
      { sizeId: "s-23", sizeLabel: "36", variantSku: null, quantity:  8, reorderLevel: 5 },
      { sizeId: "s-24", sizeLabel: "38", variantSku: null, quantity:  4, reorderLevel: 5 },
    ],
    totalStock: 54, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-14", name: "Nike Pro Compression Tee", sku: "NK-PCT-001", externalBarcode: null,
    categoryId: "cat-5", categoryName: "Dry-Fit T-Shirts", brandId: "br-1", brandName: "Nike",
    basePrice: 1799, costPrice: 1050,
    attributes: { sleeve: "Half Sleeve", sport: "Gym", color: "Red" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-26", sizeLabel: "S",  variantSku: null, quantity: 10, reorderLevel: 5 },
      { sizeId: "s-27", sizeLabel: "M",  variantSku: null, quantity: 18, reorderLevel: 5 },
      { sizeId: "s-28", sizeLabel: "L",  variantSku: null, quantity: 15, reorderLevel: 5 },
      { sizeId: "s-29", sizeLabel: "XL", variantSku: null, quantity:  8, reorderLevel: 5 },
    ],
    totalStock: 51, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-15", name: "Adidas V-Neck Tee", sku: "AD-VN-001", externalBarcode: null,
    categoryId: "cat-1", categoryName: "T-Shirts", brandId: "br-2", brandName: "Adidas",
    basePrice: 899, costPrice: 500,
    attributes: { sleeve: "Half Sleeve", neckType: "V-Neck", color: "Grey Melange" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-2", sizeLabel: "S",   variantSku: null, quantity: 18, reorderLevel: 5 },
      { sizeId: "s-3", sizeLabel: "M",   variantSku: null, quantity: 28, reorderLevel: 5 },
      { sizeId: "s-4", sizeLabel: "L",   variantSku: null, quantity: 22, reorderLevel: 5 },
      { sizeId: "s-5", sizeLabel: "XL",  variantSku: null, quantity: 12, reorderLevel: 5 },
      { sizeId: "s-6", sizeLabel: "XXL", variantSku: null, quantity:  6, reorderLevel: 5 },
    ],
    totalStock: 86, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
];

export const DEFAULT_STOCK_ROWS: MockStockRow[] = [
  { id: "se-1",  productId: "prod-1",  productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike",        sizeId: "s-26", sizeLabel: "S",  quantity: 15, reorderLevel: 5, status: "OK"  },
  { id: "se-2",  productId: "prod-1",  productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike",        sizeId: "s-27", sizeLabel: "M",  quantity: 25, reorderLevel: 5, status: "OK"  },
  { id: "se-3",  productId: "prod-1",  productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike",        sizeId: "s-28", sizeLabel: "L",  quantity: 20, reorderLevel: 5, status: "OK"  },
  { id: "se-4",  productId: "prod-1",  productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike",        sizeId: "s-29", sizeLabel: "XL", quantity: 10, reorderLevel: 5, status: "OK"  },
  { id: "se-5",  productId: "prod-1",  productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", categoryName: "Dry-Fit T-Shirts", brandName: "Nike",        sizeId: "s-30", sizeLabel: "XXL",quantity:  5, reorderLevel: 5, status: "LOW" },
  { id: "se-6",  productId: "prod-2",  productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001",  categoryName: "T-Shirts",         brandName: "Adidas",      sizeId: "s-2",  sizeLabel: "S",  quantity: 20, reorderLevel: 5, status: "OK"  },
  { id: "se-7",  productId: "prod-2",  productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001",  categoryName: "T-Shirts",         brandName: "Adidas",      sizeId: "s-3",  sizeLabel: "M",  quantity: 30, reorderLevel: 5, status: "OK"  },
  { id: "se-8",  productId: "prod-2",  productName: "Adidas Classic Round Neck Tee", sku: "AD-RN-001",  categoryName: "T-Shirts",         brandName: "Adidas",      sizeId: "s-4",  sizeLabel: "L",  quantity: 25, reorderLevel: 5, status: "OK"  },
  { id: "se-9",  productId: "prod-4",  productName: "Levi's 511 Slim Fit Jeans",     sku: "LV-511-001", categoryName: "Jeans",            brandName: "Levi's",      sizeId: "s-12", sizeLabel: "28", quantity:  3, reorderLevel: 5, status: "LOW" },
  { id: "se-10", productId: "prod-4",  productName: "Levi's 511 Slim Fit Jeans",     sku: "LV-511-001", categoryName: "Jeans",            brandName: "Levi's",      sizeId: "s-13", sizeLabel: "30", quantity: 15, reorderLevel: 5, status: "OK"  },
  { id: "se-11", productId: "prod-4",  productName: "Levi's 511 Slim Fit Jeans",     sku: "LV-511-001", categoryName: "Jeans",            brandName: "Levi's",      sizeId: "s-14", sizeLabel: "32", quantity:  0, reorderLevel: 5, status: "OUT" },
  { id: "se-12", productId: "prod-4",  productName: "Levi's 511 Slim Fit Jeans",     sku: "LV-511-001", categoryName: "Jeans",            brandName: "Levi's",      sizeId: "s-15", sizeLabel: "34", quantity: 12, reorderLevel: 5, status: "OK"  },
  { id: "se-13", productId: "prod-6",  productName: "Allen Solly Formal Shirt",      sku: "AS-FS-001",  categoryName: "Shirts",           brandName: "Allen Solly", sizeId: "s-7",  sizeLabel: "S",  quantity:  2, reorderLevel: 5, status: "LOW" },
  { id: "se-14", productId: "prod-6",  productName: "Allen Solly Formal Shirt",      sku: "AS-FS-001",  categoryName: "Shirts",           brandName: "Allen Solly", sizeId: "s-8",  sizeLabel: "M",  quantity: 20, reorderLevel: 5, status: "OK"  },
  { id: "se-15", productId: "prod-6",  productName: "Allen Solly Formal Shirt",      sku: "AS-FS-001",  categoryName: "Shirts",           brandName: "Allen Solly", sizeId: "s-9",  sizeLabel: "L",  quantity:  0, reorderLevel: 5, status: "OUT" },
  { id: "se-16", productId: "prod-12", productName: "Puma Slim Pants",               sku: "PM-SP-001",  categoryName: "Pants",            brandName: "Puma",        sizeId: "s-19", sizeLabel: "28", quantity:  5, reorderLevel: 5, status: "LOW" },
  { id: "se-17", productId: "prod-12", productName: "Puma Slim Pants",               sku: "PM-SP-001",  categoryName: "Pants",            brandName: "Puma",        sizeId: "s-20", sizeLabel: "30", quantity: 12, reorderLevel: 5, status: "OK"  },
  { id: "se-18", productId: "prod-12", productName: "Puma Slim Pants",               sku: "PM-SP-001",  categoryName: "Pants",            brandName: "Puma",        sizeId: "s-21", sizeLabel: "32", quantity: 15, reorderLevel: 5, status: "OK"  },
  { id: "se-19", productId: "prod-10", productName: "Adidas Sport Shorts",           sku: "AD-SS-001",  categoryName: "Shorts",           brandName: "Adidas",      sizeId: "s-36", sizeLabel: "S",  quantity: 15, reorderLevel: 5, status: "OK"  },
  { id: "se-20", productId: "prod-10", productName: "Adidas Sport Shorts",           sku: "AD-SS-001",  categoryName: "Shorts",           brandName: "Adidas",      sizeId: "s-37", sizeLabel: "M",  quantity: 25, reorderLevel: 5, status: "OK"  },
];

export const DEFAULT_STOCK_MOVEMENTS: MockStockMovement[] = [
  { id: "mv-1", productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", sizeLabel: "M",  type: "IN",         quantity: 10, reason: "PO #001 received",            userName: "Admin User",   createdAt: "2025-01-15T10:30:00Z" },
  { id: "mv-2", productName: "Levi's 511 Slim Fit Jeans",      sku: "LV-511-001", sizeLabel: "32", type: "SALE",       quantity:  2, reason: null,                           userName: "Staff Member", createdAt: "2025-01-14T14:20:00Z" },
  { id: "mv-3", productName: "Allen Solly Formal Shirt",       sku: "AS-FS-001",  sizeLabel: "L",  type: "ADJUSTMENT", quantity: -3, reason: "Damaged items removed",        userName: "Admin User",   createdAt: "2025-01-13T09:15:00Z" },
  { id: "mv-4", productName: "Adidas Classic Round Neck Tee",  sku: "AD-RN-001",  sizeLabel: "S",  type: "IN",         quantity: 20, reason: "Restocked from warehouse",     userName: "Admin User",   createdAt: "2025-01-12T16:45:00Z" },
  { id: "mv-5", productName: "Puma Slim Pants",                sku: "PM-SP-001",  sizeLabel: "30", type: "SALE",       quantity:  1, reason: null,                           userName: "Staff Member", createdAt: "2025-01-11T11:00:00Z" },
  { id: "mv-6", productName: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", sizeLabel: "XL", type: "RETURN",     quantity:  1, reason: "Customer return - wrong size", userName: "Staff Member", createdAt: "2025-01-10T15:30:00Z" },
  { id: "mv-7", productName: "Levi's 511 Slim Fit Jeans",      sku: "LV-511-001", sizeLabel: "28", type: "ADJUSTMENT", quantity: -5, reason: "Stock count correction",        userName: "Admin User",   createdAt: "2025-01-09T08:00:00Z" },
  { id: "mv-8", productName: "Adidas Sport Shorts",            sku: "AD-SS-001",  sizeLabel: "M",  type: "IN",         quantity: 15, reason: "PO #002 received",            userName: "Admin User",   createdAt: "2025-01-08T12:00:00Z" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Org B: Scent & Soul — Luxury Fragrance & Perfume (test-org-002)
// ═══════════════════════════════════════════════════════════════════════════════

export const ORG_B_DEFAULT_BRANDS: Omit<Brand, never>[] = [
  { id: "b-br-1", name: "Chanel",            logoUrl: null, isActive: true, productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "b-br-2", name: "Dior",              logoUrl: null, isActive: true, productCount: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "b-br-3", name: "Versace",           logoUrl: null, isActive: true, productCount: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "b-br-4", name: "Davidoff",          logoUrl: null, isActive: true, productCount: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "b-br-5", name: "Forest Essentials", logoUrl: null, isActive: true, productCount: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

export const ORG_B_DEFAULT_CATEGORIES: Category[] = [
  {
    id: "b-cat-1", name: "Eau de Parfum", slug: "eau-de-parfum",
    description: "High concentration perfume — 15–20% fragrance oil",
    attributeSchema: { fields: [
      { name: "scentFamily", type: "select", options: ["Floral","Woody","Oriental","Fresh","Citrus"], required: true },
      { name: "intensity",   type: "select", options: ["Light","Medium","Strong","Intense"],          required: true },
      { name: "gender",      type: "select", options: ["Men","Women","Unisex"],                      required: true },
    ]},
    sizes: [
      { id: "b-s-1", label: "30ml",  sortOrder: 0 },
      { id: "b-s-2", label: "50ml",  sortOrder: 1 },
      { id: "b-s-3", label: "100ml", sortOrder: 2 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-cat-2", name: "Eau de Toilette", slug: "eau-de-toilette",
    description: "Lighter concentration — 5–15% fragrance oil",
    attributeSchema: { fields: [
      { name: "scentFamily", type: "select", options: ["Floral","Woody","Oriental","Fresh","Citrus"], required: true },
      { name: "gender",      type: "select", options: ["Men","Women","Unisex"],                      required: true },
    ]},
    sizes: [
      { id: "b-s-4", label: "50ml",  sortOrder: 0 },
      { id: "b-s-5", label: "100ml", sortOrder: 1 },
      { id: "b-s-6", label: "200ml", sortOrder: 2 },
    ],
    productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-cat-3", name: "Perfume Gift Sets", slug: "gift-sets",
    description: "Curated gift sets — perfume + accessories",
    attributeSchema: { fields: [
      { name: "setContents", type: "text",   required: true },
      { name: "occasion",    type: "select", options: ["Birthday","Anniversary","Festival","Corporate"], required: false },
    ]},
    sizes: [
      { id: "b-s-7", label: "Standard Set", sortOrder: 0 },
      { id: "b-s-8", label: "Premium Set",  sortOrder: 1 },
    ],
    productCount: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-cat-4", name: "Attar & Oud", slug: "attar-oud",
    description: "Traditional concentrated oil-based fragrances",
    attributeSchema: { fields: [
      { name: "base",   type: "select", options: ["Oud","Rose","Sandalwood","Musk","Amber"], required: true  },
      { name: "origin", type: "select", options: ["Indian","Arabic","Persian"],              required: false },
      { name: "purity", type: "select", options: ["Pure","Blended"],                        required: true  },
    ]},
    sizes: [
      { id: "b-s-9",  label: "3ml",  sortOrder: 0 },
      { id: "b-s-10", label: "6ml",  sortOrder: 1 },
      { id: "b-s-11", label: "12ml", sortOrder: 2 },
    ],
    productCount: 1, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
];

export const ORG_B_DEFAULT_PRODUCTS: Product[] = [
  {
    id: "b-prod-1", name: "Chanel No. 5 Eau de Parfum", sku: "CN-N5-EDP", externalBarcode: "3145891164258",
    categoryId: "b-cat-1", categoryName: "Eau de Parfum", brandId: "b-br-1", brandName: "Chanel",
    basePrice: 12500, costPrice: 8000,
    attributes: { scentFamily: "Floral", intensity: "Intense", gender: "Women" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "b-s-1", sizeLabel: "30ml",  variantSku: "CN-N5-EDP-30",  quantity: 12, reorderLevel: 3 },
      { sizeId: "b-s-2", sizeLabel: "50ml",  variantSku: "CN-N5-EDP-50",  quantity: 20, reorderLevel: 5 },
      { sizeId: "b-s-3", sizeLabel: "100ml", variantSku: "CN-N5-EDP-100", quantity:  8, reorderLevel: 3 },
    ],
    totalStock: 40, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-prod-2", name: "Dior Sauvage Eau de Toilette", sku: "DR-SV-EDT", externalBarcode: "3348901250121",
    categoryId: "b-cat-2", categoryName: "Eau de Toilette", brandId: "b-br-2", brandName: "Dior",
    basePrice: 9800, costPrice: 6200,
    attributes: { scentFamily: "Fresh", gender: "Men" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "b-s-4", sizeLabel: "50ml",  variantSku: "DR-SV-EDT-50",  quantity: 15, reorderLevel: 5 },
      { sizeId: "b-s-5", sizeLabel: "100ml", variantSku: "DR-SV-EDT-100", quantity: 18, reorderLevel: 5 },
      { sizeId: "b-s-6", sizeLabel: "200ml", variantSku: "DR-SV-EDT-200", quantity:  6, reorderLevel: 2 },
    ],
    totalStock: 39, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-prod-3", name: "Versace Eros Eau de Parfum", sku: "VS-ER-EDP", externalBarcode: "8011003865499",
    categoryId: "b-cat-1", categoryName: "Eau de Parfum", brandId: "b-br-3", brandName: "Versace",
    basePrice: 7200, costPrice: 4500,
    attributes: { scentFamily: "Oriental", intensity: "Strong", gender: "Men" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "b-s-1", sizeLabel: "30ml",  variantSku: "VS-ER-EDP-30",  quantity:  8, reorderLevel: 3 },
      { sizeId: "b-s-2", sizeLabel: "50ml",  variantSku: "VS-ER-EDP-50",  quantity: 14, reorderLevel: 4 },
      { sizeId: "b-s-3", sizeLabel: "100ml", variantSku: "VS-ER-EDP-100", quantity: 10, reorderLevel: 3 },
    ],
    totalStock: 32, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-prod-4", name: "Davidoff Cool Water EDT", sku: "DF-CW-EDT", externalBarcode: "3607342117228",
    categoryId: "b-cat-2", categoryName: "Eau de Toilette", brandId: "b-br-4", brandName: "Davidoff",
    basePrice: 2800, costPrice: 1600,
    attributes: { scentFamily: "Fresh", gender: "Men" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "b-s-4", sizeLabel: "50ml",  variantSku: "DF-CW-EDT-50",  quantity: 25, reorderLevel: 8 },
      { sizeId: "b-s-5", sizeLabel: "100ml", variantSku: "DF-CW-EDT-100", quantity: 20, reorderLevel: 6 },
    ],
    totalStock: 45, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-prod-5", name: "Royal Oud Pure Attar", sku: "RO-OUD-3ML", externalBarcode: null,
    categoryId: "b-cat-4", categoryName: "Attar & Oud", brandId: "b-br-5", brandName: "Forest Essentials",
    basePrice: 3500, costPrice: 1800,
    attributes: { base: "Oud", origin: "Arabic", purity: "Pure" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "b-s-9",  sizeLabel: "3ml",  variantSku: "RO-OUD-3ML",  quantity: 30, reorderLevel: 10 },
      { sizeId: "b-s-10", sizeLabel: "6ml",  variantSku: "RO-OUD-6ML",  quantity: 20, reorderLevel: 6  },
      { sizeId: "b-s-11", sizeLabel: "12ml", variantSku: "RO-OUD-12ML", quantity: 10, reorderLevel: 3  },
    ],
    totalStock: 60, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "b-prod-6", name: "Chanel Chance Gift Set", sku: "CN-CG-SET", externalBarcode: null,
    categoryId: "b-cat-3", categoryName: "Perfume Gift Sets", brandId: "b-br-1", brandName: "Chanel",
    basePrice: 18000, costPrice: 12000,
    attributes: { setContents: "50ml EDP + body lotion + pouch", occasion: "Birthday" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "b-s-7", sizeLabel: "Standard Set", variantSku: "CN-CG-SET-STD", quantity: 6, reorderLevel: 2 },
      { sizeId: "b-s-8", sizeLabel: "Premium Set",  variantSku: "CN-CG-SET-PRE", quantity: 4, reorderLevel: 2 },
    ],
    totalStock: 10, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
];

export const ORG_B_DEFAULT_STOCK_ROWS: MockStockRow[] = [
  { id: "b-se-1",  productId: "b-prod-1", productName: "Chanel No. 5 Eau de Parfum",   sku: "CN-N5-EDP",  categoryName: "Eau de Parfum",     brandName: "Chanel",            sizeId: "b-s-1", sizeLabel: "30ml",        quantity: 12, reorderLevel: 3, status: "OK" },
  { id: "b-se-2",  productId: "b-prod-1", productName: "Chanel No. 5 Eau de Parfum",   sku: "CN-N5-EDP",  categoryName: "Eau de Parfum",     brandName: "Chanel",            sizeId: "b-s-2", sizeLabel: "50ml",        quantity: 20, reorderLevel: 5, status: "OK" },
  { id: "b-se-3",  productId: "b-prod-1", productName: "Chanel No. 5 Eau de Parfum",   sku: "CN-N5-EDP",  categoryName: "Eau de Parfum",     brandName: "Chanel",            sizeId: "b-s-3", sizeLabel: "100ml",       quantity:  8, reorderLevel: 3, status: "OK" },
  { id: "b-se-4",  productId: "b-prod-2", productName: "Dior Sauvage Eau de Toilette", sku: "DR-SV-EDT",  categoryName: "Eau de Toilette",   brandName: "Dior",              sizeId: "b-s-4", sizeLabel: "50ml",        quantity: 15, reorderLevel: 5, status: "OK" },
  { id: "b-se-5",  productId: "b-prod-2", productName: "Dior Sauvage Eau de Toilette", sku: "DR-SV-EDT",  categoryName: "Eau de Toilette",   brandName: "Dior",              sizeId: "b-s-5", sizeLabel: "100ml",       quantity: 18, reorderLevel: 5, status: "OK" },
  { id: "b-se-6",  productId: "b-prod-2", productName: "Dior Sauvage Eau de Toilette", sku: "DR-SV-EDT",  categoryName: "Eau de Toilette",   brandName: "Dior",              sizeId: "b-s-6", sizeLabel: "200ml",       quantity:  6, reorderLevel: 2, status: "OK" },
  { id: "b-se-7",  productId: "b-prod-3", productName: "Versace Eros Eau de Parfum",   sku: "VS-ER-EDP",  categoryName: "Eau de Parfum",     brandName: "Versace",           sizeId: "b-s-1", sizeLabel: "30ml",        quantity:  8, reorderLevel: 3, status: "OK" },
  { id: "b-se-8",  productId: "b-prod-3", productName: "Versace Eros Eau de Parfum",   sku: "VS-ER-EDP",  categoryName: "Eau de Parfum",     brandName: "Versace",           sizeId: "b-s-2", sizeLabel: "50ml",        quantity: 14, reorderLevel: 4, status: "OK" },
  { id: "b-se-9",  productId: "b-prod-3", productName: "Versace Eros Eau de Parfum",   sku: "VS-ER-EDP",  categoryName: "Eau de Parfum",     brandName: "Versace",           sizeId: "b-s-3", sizeLabel: "100ml",       quantity: 10, reorderLevel: 3, status: "OK" },
  { id: "b-se-10", productId: "b-prod-4", productName: "Davidoff Cool Water EDT",       sku: "DF-CW-EDT",  categoryName: "Eau de Toilette",   brandName: "Davidoff",          sizeId: "b-s-4", sizeLabel: "50ml",        quantity: 25, reorderLevel: 8, status: "OK" },
  { id: "b-se-11", productId: "b-prod-4", productName: "Davidoff Cool Water EDT",       sku: "DF-CW-EDT",  categoryName: "Eau de Toilette",   brandName: "Davidoff",          sizeId: "b-s-5", sizeLabel: "100ml",       quantity: 20, reorderLevel: 6, status: "OK" },
  { id: "b-se-12", productId: "b-prod-5", productName: "Royal Oud Pure Attar",          sku: "RO-OUD-3ML", categoryName: "Attar & Oud",       brandName: "Forest Essentials", sizeId: "b-s-9",  sizeLabel: "3ml",        quantity: 30, reorderLevel: 10, status: "OK" },
  { id: "b-se-13", productId: "b-prod-5", productName: "Royal Oud Pure Attar",          sku: "RO-OUD-3ML", categoryName: "Attar & Oud",       brandName: "Forest Essentials", sizeId: "b-s-10", sizeLabel: "6ml",        quantity: 20, reorderLevel: 6,  status: "OK" },
  { id: "b-se-14", productId: "b-prod-5", productName: "Royal Oud Pure Attar",          sku: "RO-OUD-3ML", categoryName: "Attar & Oud",       brandName: "Forest Essentials", sizeId: "b-s-11", sizeLabel: "12ml",       quantity: 10, reorderLevel: 3,  status: "OK" },
  { id: "b-se-15", productId: "b-prod-6", productName: "Chanel Chance Gift Set",        sku: "CN-CG-SET",  categoryName: "Perfume Gift Sets", brandName: "Chanel",            sizeId: "b-s-7", sizeLabel: "Standard Set", quantity: 6, reorderLevel: 2, status: "OK" },
  { id: "b-se-16", productId: "b-prod-6", productName: "Chanel Chance Gift Set",        sku: "CN-CG-SET",  categoryName: "Perfume Gift Sets", brandName: "Chanel",            sizeId: "b-s-8", sizeLabel: "Premium Set",  quantity: 4, reorderLevel: 2, status: "OK" },
];

export const ORG_B_DEFAULT_STOCK_MOVEMENTS: MockStockMovement[] = [
  { id: "b-mv-1", productName: "Chanel No. 5 Eau de Parfum",   sku: "CN-N5-EDP",  sizeLabel: "50ml",  type: "IN",         quantity: 20, reason: "Initial stock received",          userName: "Kavya Reddy",  createdAt: "2025-01-15T10:30:00Z" },
  { id: "b-mv-2", productName: "Dior Sauvage Eau de Toilette", sku: "DR-SV-EDT",  sizeLabel: "100ml", type: "SALE",       quantity:  3, reason: null,                              userName: "Rohit Sharma", createdAt: "2025-01-14T14:20:00Z" },
  { id: "b-mv-3", productName: "Versace Eros Eau de Parfum",   sku: "VS-ER-EDP",  sizeLabel: "50ml",  type: "IN",         quantity: 14, reason: "Restocked from distributor",      userName: "Vikram Patel", createdAt: "2025-01-13T09:15:00Z" },
  { id: "b-mv-4", productName: "Davidoff Cool Water EDT",       sku: "DF-CW-EDT",  sizeLabel: "50ml",  type: "ADJUSTMENT", quantity: -2, reason: "Bottle damaged in transit",       userName: "Vikram Patel", createdAt: "2025-01-12T11:00:00Z" },
  { id: "b-mv-5", productName: "Royal Oud Pure Attar",          sku: "RO-OUD-3ML", sizeLabel: "3ml",   type: "SALE",       quantity:  5, reason: null,                              userName: "Rohit Sharma", createdAt: "2025-01-11T16:30:00Z" },
];

// ─── Org-keyed in-memory store ────────────────────────────────────────────────

export interface OrgMockData {
  brands: Brand[];
  brandNextId: number;
  categories: Category[];
  categoryNextId: number;
  products: Product[];
  productNextId: number;
  stockRows: MockStockRow[];
  stockMovements: MockStockMovement[];
  stockMvNextId: number;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

type OrgSeed = {
  brands: Omit<Brand, never>[];
  categories: Category[];
  products: Product[];
  stockRows: MockStockRow[];
  stockMovements: MockStockMovement[];
};

const ORG_B_SEED: OrgSeed = {
  brands: ORG_B_DEFAULT_BRANDS,
  categories: ORG_B_DEFAULT_CATEGORIES,
  products: ORG_B_DEFAULT_PRODUCTS,
  stockRows: ORG_B_DEFAULT_STOCK_ROWS,
  stockMovements: ORG_B_DEFAULT_STOCK_MOVEMENTS,
};

function makeOrgData(seed?: OrgSeed): OrgMockData {
  const b  = seed?.brands         ?? DEFAULT_BRANDS;
  const c  = seed?.categories     ?? DEFAULT_CATEGORIES;
  const p  = seed?.products       ?? DEFAULT_PRODUCTS;
  const sr = seed?.stockRows      ?? DEFAULT_STOCK_ROWS;
  const sm = seed?.stockMovements ?? DEFAULT_STOCK_MOVEMENTS;
  return {
    brands:         deepClone(b),
    brandNextId:    b.length + 1,
    categories:     deepClone(c),
    categoryNextId: c.length + 1,
    products:       deepClone(p),
    productNextId:  p.length + 1,
    stockRows:      deepClone(sr),
    stockMovements: deepClone(sm),
    stockMvNextId:  sm.length + 1,
  };
}

// Singleton map: orgId → data
const orgStore = new Map<string, OrgMockData>();

/**
 * Get (or lazily seed) the mock data for a given org.
 * - test-org-001 (Rare Thread)  → clothing/apparel seed data
 * - test-org-002 (Scent & Soul) → fragrance/perfume seed data
 * - any other orgId             → isolated copy of default clothing data
 */
export function getOrgData(orgId: string): OrgMockData {
  if (!orgStore.has(orgId)) {
    orgStore.set(orgId, makeOrgData(orgId === "test-org-002" ? ORG_B_SEED : undefined));
  }
  return orgStore.get(orgId)!;
}
