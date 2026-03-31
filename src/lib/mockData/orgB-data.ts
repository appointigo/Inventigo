/**
 * Mock data for Org B: "Scent & Soul" — a luxury fragrance & perfume retail store.
 *
 * orgId:   "test-org-002"
 * owner:   owner@scentandsoul.com   /  password: password
 * admin:   admin@scentandsoul.com   /  password: password
 * manager: manager@scentandsoul.com /  password: password
 * staff:   staff@scentandsoul.com   /  password: password
 *
 * Credentials are pre-seeded in auth.ts alongside Org A credentials.
 *
 * Used for: verifying tenant isolation by logging in as Org B and confirming
 *           zero Org A data appears in products/brands/categories/stock pages.
 */

// ─── Org & Store ─────────────────────────────────────────────────────────────

export const ORG_B = {
  id: "test-org-002",
  name: "Scent & Soul",
  slug: "scent-and-soul",
  plan: "STARTER" as const,
  isActive: true,
};

export const ORG_B_STORE = {
  id: "store-002",
  orgId: "test-org-002",
  name: "Scent & Soul — Flagship",
  code: "SS-MAIN",
  address: "34, Luxury Lane, Connaught Place, New Delhi - 110001",
  phone: "+91 11 4155 6000",
  isActive: true,
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const ORG_B_USERS = [
  { id: "u-b-1", name: "Kavya Reddy",   email: "owner@scentandsoul.com",   role: "OWNER",   isActive: true },
  { id: "u-b-2", name: "Vikram Patel",  email: "admin@scentandsoul.com",   role: "ADMIN",   isActive: true },
  { id: "u-b-3", name: "Meera Joshi",   email: "manager@scentandsoul.com", role: "MANAGER", isActive: true },
  { id: "u-b-4", name: "Rohit Sharma",  email: "staff@scentandsoul.com",   role: "STAFF",   isActive: true },
];

// ─── Brands (Org B only — should NOT be visible to Org A) ────────────────────

export const ORG_B_BRANDS = [
  { id: "b-br-1", name: "Chanel",       isActive: true, productCount: 4 },
  { id: "b-br-2", name: "Dior",         isActive: true, productCount: 3 },
  { id: "b-br-3", name: "Versace",      isActive: true, productCount: 3 },
  { id: "b-br-4", name: "Davidoff",     isActive: true, productCount: 2 },
  { id: "b-br-5", name: "Forest Essentials", isActive: true, productCount: 2 },
];

// ─── Categories (Org B only) ──────────────────────────────────────────────────

export const ORG_B_CATEGORIES = [
  {
    id: "b-cat-1",
    name: "Eau de Parfum",
    slug: "eau-de-parfum",
    description: "High concentration perfume — 15–20% fragrance oil",
    attributeSchema: {
      fields: [
        { name: "scentFamily",  type: "select", options: ["Floral","Woody","Oriental","Fresh","Citrus"], required: true },
        { name: "intensity",    type: "select", options: ["Light","Medium","Strong","Intense"],           required: true },
        { name: "gender",       type: "select", options: ["Men","Women","Unisex"],                       required: true },
      ],
    },
    sizes: [
      { id: "b-s-1", label: "30ml",  sortOrder: 0 },
      { id: "b-s-2", label: "50ml",  sortOrder: 1 },
      { id: "b-s-3", label: "100ml", sortOrder: 2 },
    ],
    productCount: 4,
  },
  {
    id: "b-cat-2",
    name: "Eau de Toilette",
    slug: "eau-de-toilette",
    description: "Lighter concentration — 5–15% fragrance oil",
    attributeSchema: {
      fields: [
        { name: "scentFamily", type: "select", options: ["Floral","Woody","Oriental","Fresh","Citrus"], required: true },
        { name: "gender",      type: "select", options: ["Men","Women","Unisex"],                      required: true },
      ],
    },
    sizes: [
      { id: "b-s-4", label: "50ml",  sortOrder: 0 },
      { id: "b-s-5", label: "100ml", sortOrder: 1 },
      { id: "b-s-6", label: "200ml", sortOrder: 2 },
    ],
    productCount: 3,
  },
  {
    id: "b-cat-3",
    name: "Perfume Gift Sets",
    slug: "gift-sets",
    description: "Curated gift sets — perfume + accessories",
    attributeSchema: {
      fields: [
        { name: "setContents", type: "text", required: true },
        { name: "occasion",    type: "select", options: ["Birthday","Anniversary","Festival","Corporate"], required: false },
      ],
    },
    sizes: [
      { id: "b-s-7", label: "Standard Set", sortOrder: 0 },
      { id: "b-s-8", label: "Premium Set",  sortOrder: 1 },
    ],
    productCount: 3,
  },
  {
    id: "b-cat-4",
    name: "Attar & Oud",
    slug: "attar-oud",
    description: "Traditional concentrated oil-based fragrances",
    attributeSchema: {
      fields: [
        { name: "base",     type: "select", options: ["Oud","Rose","Sandalwood","Musk","Amber"], required: true },
        { name: "origin",   type: "select", options: ["Indian","Arabic","Persian"],              required: false },
        { name: "purity",   type: "select", options: ["Pure","Blended"],                         required: true },
      ],
    },
    sizes: [
      { id: "b-s-9",  label: "3ml",   sortOrder: 0 },
      { id: "b-s-10", label: "6ml",   sortOrder: 1 },
      { id: "b-s-11", label: "12ml",  sortOrder: 2 },
    ],
    productCount: 4,
  },
];

// ─── Sample Products ──────────────────────────────────────────────────────────

export const ORG_B_PRODUCTS = [
  {
    id: "b-prod-1",
    name: "Chanel No. 5 Eau de Parfum",
    sku: "CN-N5-EDP",
    externalBarcode: "3145891164258",
    category: "Eau de Parfum",
    brand: "Chanel",
    basePrice: 12500,
    costPrice: 8000,
    attributes: { scentFamily: "Floral", intensity: "Intense", gender: "Women" },
    stock: [
      { sizeLabel: "30ml",  quantity: 12, reorderLevel: 3 },
      { sizeLabel: "50ml",  quantity: 20, reorderLevel: 5 },
      { sizeLabel: "100ml", quantity: 8,  reorderLevel: 3 },
    ],
    totalStock: 40,
  },
  {
    id: "b-prod-2",
    name: "Dior Sauvage Eau de Toilette",
    sku: "DR-SV-EDT",
    externalBarcode: "3348901250121",
    category: "Eau de Toilette",
    brand: "Dior",
    basePrice: 9800,
    costPrice: 6200,
    attributes: { scentFamily: "Fresh", gender: "Men" },
    stock: [
      { sizeLabel: "50ml",  quantity: 15, reorderLevel: 5 },
      { sizeLabel: "100ml", quantity: 18, reorderLevel: 5 },
      { sizeLabel: "200ml", quantity: 6,  reorderLevel: 2 },
    ],
    totalStock: 39,
  },
  {
    id: "b-prod-3",
    name: "Versace Eros Eau de Parfum",
    sku: "VS-ER-EDP",
    externalBarcode: "8011003865499",
    category: "Eau de Parfum",
    brand: "Versace",
    basePrice: 7200,
    costPrice: 4500,
    attributes: { scentFamily: "Oriental", intensity: "Strong", gender: "Men" },
    stock: [
      { sizeLabel: "30ml",  quantity: 8,  reorderLevel: 3 },
      { sizeLabel: "50ml",  quantity: 14, reorderLevel: 4 },
      { sizeLabel: "100ml", quantity: 10, reorderLevel: 3 },
    ],
    totalStock: 32,
  },
  {
    id: "b-prod-4",
    name: "Davidoff Cool Water EDT",
    sku: "DF-CW-EDT",
    externalBarcode: "3607342117228",
    category: "Eau de Toilette",
    brand: "Davidoff",
    basePrice: 2800,
    costPrice: 1600,
    attributes: { scentFamily: "Fresh", gender: "Men" },
    stock: [
      { sizeLabel: "50ml",  quantity: 25, reorderLevel: 8 },
      { sizeLabel: "100ml", quantity: 20, reorderLevel: 6 },
    ],
    totalStock: 45,
  },
  {
    id: "b-prod-5",
    name: "Royal Oud Pure Attar",
    sku: "RO-OUD-3ML",
    externalBarcode: null,
    category: "Attar & Oud",
    brand: "Forest Essentials",
    basePrice: 3500,
    costPrice: 1800,
    attributes: { base: "Oud", origin: "Arabic", purity: "Pure" },
    stock: [
      { sizeLabel: "3ml",  quantity: 30, reorderLevel: 10 },
      { sizeLabel: "6ml",  quantity: 20, reorderLevel: 6  },
      { sizeLabel: "12ml", quantity: 10, reorderLevel: 3  },
    ],
    totalStock: 60,
  },
  {
    id: "b-prod-6",
    name: "Chanel Chance Gift Set",
    sku: "CN-CG-SET",
    externalBarcode: null,
    category: "Perfume Gift Sets",
    brand: "Chanel",
    basePrice: 18000,
    costPrice: 12000,
    attributes: { setContents: "50ml EDP + body lotion + pouch", occasion: "Birthday" },
    stock: [
      { sizeLabel: "Standard Set", quantity: 6, reorderLevel: 2 },
      { sizeLabel: "Premium Set",  quantity: 4, reorderLevel: 2 },
    ],
    totalStock: 10,
  },
];

// ─── Verification Scenarios ───────────────────────────────────────────────────

/**
 * Checklist: Org B Isolation Tests
 *
 * These scenarios should be verified in the UI when logged in as any Org B user:
 *
 *  ✅  Dashboard shows ONLY Scent & Soul data — NOT Rare Thread data
 *  ✅  Products page shows perfume/fragrance products — NOT clothing items
 *  ✅  Brands list: Chanel, Dior, Versace, Davidoff, Forest Essentials — NOT Nike/Adidas/Puma
 *  ✅  Categories: Eau de Parfum, Eau de Toilette, Gift Sets, Attar & Oud — NOT T-Shirts/Jeans
 *  ✅  Stock table: shows perfume SKUs only
 *  ✅  Creating a new product under Org B is invisible to Org A users
 */
export const ORG_B_VERIFICATION_CHECKLIST = [
  { id: "b-01", scenario: "Products isolation",       description: "Log in as owner@scentandsoul.com → Products page shows 6 fragrance products, NO clothing items" },
  { id: "b-02", scenario: "Brands isolation",         description: "Brands page shows: Chanel, Dior, Versace, Davidoff, Forest Essentials — Nike/Adidas/Puma must NOT appear" },
  { id: "b-03", scenario: "Categories isolation",     description: "Categories page shows perfume categories — T-Shirts/Shirts/Jeans must NOT appear" },
  { id: "b-04", scenario: "Stock isolation",          description: "Stock page shows perfume SKUs (30ml/50ml/100ml variants) — no apparel sizes (S/M/L/XL)" },
  { id: "b-05", scenario: "Dashboard KPIs",           description: "Dashboard total products ≈ 6, stock values reflect fragrance price points (₹2800–₹18000)" },
  { id: "b-06", scenario: "Cross-tenant block",       description: "Manually call GET /api/brands → returns Scent & Soul brands, NOT Rare Thread brands" },
  { id: "b-07", scenario: "OWNER nav items",          description: "Log in as owner@scentandsoul.com → Org Settings + Team Management visible in nav" },
  { id: "b-08", scenario: "STAFF nav restriction",    description: "Log in as staff@scentandsoul.com → Org Settings / Team / Billing NOT in nav" },
  { id: "b-09", scenario: "New product visibility",   description: "Create 'Rose Musk Attar' as Org B ADMIN → log out → log in as Org A → product must NOT appear" },
  { id: "b-10", scenario: "Product image upload",     description: "Upload fragrance bottle image → Vercel Blob URL stored → thumbnail shown in product card" },
];
