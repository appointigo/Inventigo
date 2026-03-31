/**
 * Mock data for Org A: "Rare Thread" — a multi-brand clothing retail store.
 *
 * orgId:   "test-org-001"   (matches the seed credential in auth.ts)
 * owner:   owner@rarethread.com   /  password: password
 * admin:   admin@rarethread.com   /  password: password
 * manager: manager@rarethread.com /  password: password
 * staff:   staff@rarethread.com   /  password: password
 *
 * Used for: multi-tenant isolation testing, verification checklist UI scenarios.
 * NOTE: This data is already loaded into mock-org-store.ts as the default seed.
 *       This file documents the expected state for verification.
 */

// ─── Org & Store ─────────────────────────────────────────────────────────────

export const ORG_A = {
  id: "test-org-001",
  name: "Rare Thread",
  slug: "rare-thread",
  plan: "GROWTH" as const,
  isActive: true,
};

export const ORG_A_STORE = {
  id: "store-001",
  orgId: "test-org-001",
  name: "Rare Thread — Main Store",
  code: "RT-MAIN",
  address: "12, Fashion Street, Bandra West, Mumbai - 400050",
  phone: "+91 22 2645 1000",
  isActive: true,
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const ORG_A_USERS = [
  { id: "u-a-1", name: "Priya Sharma",  email: "owner@rarethread.com",   role: "OWNER",   isActive: true },
  { id: "u-a-2", name: "Rahul Verma",   email: "admin@rarethread.com",   role: "ADMIN",   isActive: true },
  { id: "u-a-3", name: "Sneha Kulkarni",email: "manager@rarethread.com", role: "MANAGER", isActive: true },
  { id: "u-a-4", name: "Arjun Nair",    email: "staff@rarethread.com",   role: "STAFF",   isActive: true },
];

// ─── Brands (Org A only — should NOT be visible to Org B) ────────────────────

export const ORG_A_BRANDS = [
  { id: "br-1", name: "Nike",        isActive: true, productCount: 4 },
  { id: "br-2", name: "Adidas",      isActive: true, productCount: 3 },
  { id: "br-3", name: "Puma",        isActive: true, productCount: 3 },
  { id: "br-4", name: "Levi's",      isActive: true, productCount: 2 },
  { id: "br-5", name: "Allen Solly", isActive: true, productCount: 3 },
];

// ─── Categories (Org A only) ──────────────────────────────────────────────────

export const ORG_A_CATEGORIES = [
  { id: "cat-1", name: "T-Shirts",          productCount: 3 },
  { id: "cat-2", name: "Shirts",            productCount: 2 },
  { id: "cat-3", name: "Jeans",             productCount: 2 },
  { id: "cat-4", name: "Pants",             productCount: 2 },
  { id: "cat-5", name: "Dry-Fit T-Shirts",  productCount: 2 },
  { id: "cat-6", name: "Lowers",            productCount: 2 },
  { id: "cat-7", name: "Shorts",            productCount: 2 },
];

// ─── Sample Products (representative subset) ─────────────────────────────────

export const ORG_A_PRODUCTS_SAMPLE = [
  { id: "prod-1", name: "Nike Dri-FIT Running Tee",       sku: "NK-DFT-001", category: "Dry-Fit T-Shirts", brand: "Nike",        basePrice: 1499, totalStock: 75  },
  { id: "prod-2", name: "Adidas Classic Round Neck Tee",  sku: "AD-RN-001",  category: "T-Shirts",         brand: "Adidas",      basePrice:  999, totalStock: 98  },
  { id: "prod-3", name: "Puma Polo T-Shirt",              sku: "PM-PT-001",  category: "T-Shirts",         brand: "Puma",        basePrice: 1299, totalStock: 65  },
  { id: "prod-4", name: "Levi's 511 Slim Fit Jeans",      sku: "LV-511-001", category: "Jeans",            brand: "Levi's",      basePrice: 2999, totalStock: 61  },
  { id: "prod-5", name: "Allen Solly Formal Shirt",       sku: "AS-FS-001",  category: "Shirts",           brand: "Allen Solly", basePrice: 1799, totalStock: 57  },
];

// ─── Verification Scenarios ───────────────────────────────────────────────────

/**
 * Checklist: Org A Isolation Tests
 *
 * These scenarios should be verified in the UI when logged in as any Org A user:
 *
 *  ✅  Dashboard KPIs reflect ONLY Org A products/stock (not Org B)
 *  ✅  Products list: 15 products all belonging to Org A brands/categories
 *  ✅  Brands list: 5 brands — Nike, Adidas, Puma, Levi's, Allen Solly
 *  ✅  Categories list: 7 categories (T-Shirts, Shirts, Jeans, Pants, Dry-Fit, Lowers, Shorts)
 *  ✅  Stock table: entries only for Org A products
 *  ✅  Creating a new product under Org A owning user is NOT visible when logged in as Org B
 *  ✅  OWNER sees "Organization Settings" in nav
 *  ✅  STAFF does NOT see "Org Settings", "Team Management", or "Billing" in nav
 *  ✅  Admin invite sent from Org A can only be accepted by users registering to Org A
 */
export const ORG_A_VERIFICATION_CHECKLIST = [
  { id: "a-01", scenario: "Products isolation",     description: "Log in as owner@rarethread.com → Products page should show 15 clothing products, zero Fragrance House products" },
  { id: "a-02", scenario: "Brands isolation",       description: "Brands page shows exactly 5 brands: Nike, Adidas, Puma, Levi's, Allen Solly — no perfume brands" },
  { id: "a-03", scenario: "Stock isolation",        description: "Stock page shows only clothing SKUs — no fragrance SKUs" },
  { id: "a-04", scenario: "Dashboard KPIs",         description: "Dashboard total products ≈ 15, total stock value reflects clothing cost prices" },
  { id: "a-05", scenario: "OWNER nav items",        description: "Log in as owner@rarethread.com → nav shows Org Settings + Team Management + Billing links" },
  { id: "a-06", scenario: "STAFF nav restriction",  description: "Log in as staff@rarethread.com → nav does NOT show Org Settings / Team Management / Billing" },
  { id: "a-07", scenario: "Cross-tenant block",     description: "Manually call GET /api/products with Org B session → should return 401/403, not Org A products" },
  { id: "a-08", scenario: "Product image upload",   description: "Create product → upload image file → Vercel Blob URL stored in imageUrl → image preview renders in form" },
  { id: "a-09", scenario: "Invite flow",            description: "OWNER sends invite → link received → accept → new user shows in Team Management with correct role" },
  { id: "a-10", scenario: "SUPER_ADMIN redirect",   description: "Log in as superadmin@inventigo.com → redirected to /admin (not /dashboard/dashboard)" },
];
