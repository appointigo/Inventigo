/**
 * Multi-tenant mock data index.
 *
 * Contains two fully-isolated tenant datasets for UI isolation testing:
 *
 *   Org A — "Rare Thread"     (test-org-001)  — clothing/apparel
 *   Org B — "Scent & Soul"    (test-org-002)  — fragrance/perfume
 *
 * Also exports a combined verification checklist usable in integration tests
 * or as a reference when manually testing the UI.
 *
 * Usage in dev:
 *   import { ORG_A, ORG_B, FULL_CHECKLIST } from "@/lib/mockData";
 */

export {
  ORG_A,
  ORG_A_STORE,
  ORG_A_USERS,
  ORG_A_BRANDS,
  ORG_A_CATEGORIES,
  ORG_A_PRODUCTS_SAMPLE,
  ORG_A_VERIFICATION_CHECKLIST,
} from "./orgA-data";

export {
  ORG_B,
  ORG_B_STORE,
  ORG_B_USERS,
  ORG_B_BRANDS,
  ORG_B_CATEGORIES,
  ORG_B_PRODUCTS,
  ORG_B_VERIFICATION_CHECKLIST,
} from "./orgB-data";

import { ORG_A_VERIFICATION_CHECKLIST } from "./orgA-data";
import { ORG_B_VERIFICATION_CHECKLIST } from "./orgB-data";

/**
 * Full combined verification checklist covering both tenants.
 * 20 scenarios total: 10 for Org A, 10 for Org B.
 */
export const FULL_CHECKLIST = [
  ...ORG_A_VERIFICATION_CHECKLIST,
  ...ORG_B_VERIFICATION_CHECKLIST,
];

/**
 * Quick-reference: test user credentials
 *
 * Org A — Rare Thread
 *   owner@rarethread.com   / password  (OWNER)
 *   admin@rarethread.com   / password  (ADMIN)
 *   manager@rarethread.com / password  (MANAGER)
 *   staff@rarethread.com   / password  (STAFF)
 *
 * Org B — Scent & Soul
 *   owner@scentandsoul.com   / password  (OWNER)
 *   admin@scentandsoul.com   / password  (ADMIN)
 *   manager@scentandsoul.com / password  (MANAGER)
 *   staff@scentandsoul.com   / password  (STAFF)
 *
 * Platform
 *   superadmin@inventigo.com / password  (SUPER_ADMIN → /admin)
 */
