# Stockiva pricing and feature implementation

**Date:** 26 September 2026  
**Scope:** Public landing page and marketing configuration only

## Delivered experience

The landing page now renders three balanced core-plan cards, two independent add-on cards, and a grouped expandable comparison from one validated catalog. Existing hero, industry, demo, booking and final CTA sections remain intact. All pricing CTAs use the real `#book-demo` form; the product CTA continues to use `/demo`.

### Core plans

- **Starter:** everyday single-store operations, including barcode billing, split/deferred payments, catalog and size-wise stock, returns/exchanges, customer history and essential reporting.
- **Growth:** inherits Starter and proposes multi-store visibility, roles, purchasing, bulk import, promotions, expenses, attendance, follow-ups and unmet-demand capture.
- **Business:** inherits Growth and offers a requirements-led commercial conversation for larger-chain scale. It does not invent exclusive application functionality.

All prices remain unpublished. The interface renders “Request Pricing” or “Contact sales” from catalog configuration, with no monthly/yearly switch.

### Optional add-ons

- **WhatsApp Marketing & Communication:** separate from every core plan. Draft copy covers merchant-owned Meta setup, templates, invoice messaging after validation, consent, campaigns, activity and eligible automations. The card visibly states that Meta charges the merchant separately.
- **Advanced Analytics & Demand Insights:** separate from every core plan. Draft copy covers margin, inventory value, sell-through, stock cover, diagnostics, comparisons, drill-down and missed-demand analysis. Essential reporting remains in Starter.

## Feature mapping

The source catalog contains all 192 audited IDs:

| Classification | Count |
|---|---:|
| Core-plan proposal | 121 |
| Add-on proposal | 37 |
| Platform-internal | 34 |
| **Total** | **192** |

Plan inclusion is derived from `minimumPlan` and `inherits`; features are not copied into each plan. Add-on placement is derived independently. The comparison uses the catalog’s group references and displays Included, Requires add-on, Planned or Not included. Internal platform rows never enter the public DTO.

## Configuration and adapter

- `src/config/marketing/pricing.catalog.json` — version-controlled commercial draft and single source of truth.
- `src/modules/marketing/pricingCatalog.ts` — Zod schema, TypeScript types, cross-reference validation, inheritance resolver and public DTO projection.
- `src/modules/marketing/getPricingCatalog.ts` — server-only data-source boundary used by `src/app/page.tsx`.
- `src/app/LandingPage.tsx` — consumes the serializable validated DTO; it does not import JSON.

The adapter can later replace its local JSON read with `GET /api/public/pricing-catalog` without changing cards or comparison components.

## Draft and publication safety

- Development/staging renders `draft-preview`, including the full proposed customer-facing package structure and a visible draft notice.
- Production renders `published`, removes internal rows and private audit limitations, excludes unapproved rows, and retains roadmap rows only as Planned.
- Because the supplied catalog currently has no `publishAsAvailable=true` rows, production does not show unqualified plan feature lists; it asks visitors to request a current workflow demonstration.
- Add-ons are marked as preview/not publicly launched in production until commercial and provider validation is approved.
- No subscription checkout, entitlement middleware, pricing CRUD or database migration was added.

## Future API and CRUD contract

### Public read

`GET /api/public/pricing-catalog`

Returns the published public DTO: catalog metadata, ordered plans, add-ons, public groups and approved/roadmap feature rows. It must omit audit limitations, internal notes and platform-internal/unapproved capabilities.

### Super-admin management

- `GET /api/admin/pricing-catalog`
- `POST /api/admin/pricing-catalog`
- `PATCH /api/admin/pricing-catalog/:id`
- `DELETE /api/admin/pricing-catalog/:id`

Future writes should require super-admin authorization, server-side schema and cross-reference validation, stable IDs, optimistic concurrency, immutable audit events, draft/published versions and explicit publication. “Delete” should archive referenced features rather than silently breaking historical configurations. Reordering, plan placement, group placement, price changes and add-on availability should all be versioned.

## Files created or modified

- `src/config/marketing/pricing.catalog.json`
- `src/modules/marketing/pricingCatalog.ts`
- `src/modules/marketing/getPricingCatalog.ts`
- `src/modules/marketing/pricingCatalog.test.ts`
- `src/app/page.tsx`
- `src/app/LandingPage.tsx`
- `src/app/LandingPage.module.css`
- `package.json`
- `docs/marketing/feature-packaging-audit.md`
- `docs/marketing/pricing-feature-implementation.md`

## Validation results

- Pricing catalog tests: **5 passed, 0 failed**. Coverage includes 192 unique IDs, classifications, inheritance, baseline Starter workflows, independent add-ons, unpublished prices and production data-leak prevention.
- TypeScript: **passed** with `npx tsc --noEmit`.
- Changed-file ESLint: **passed without errors**. Repository-wide lint remains blocked by 164 pre-existing errors and 96 warnings in unrelated application files.
- Production build: **passed** with Next.js 16.2.0; `/`, `/demo` and `POST /api/demo-requests` are present in the output.
- Local HTTP smoke test: **passed** with HTTP 200.
- Responsive CSS review covers requested 1440×900, 1280×800, 768×1024, 390×844 and 360×800 breakpoints. Plan/add-on grids collapse to one column at 760px; comparison rows become vertical per-plan blocks with no table overflow.

## Screenshots and visual review

The supplied reference `stockiva_smarter_retail_one_platform.png` was inspected at original resolution and used to preserve its cream/deep-green palette, rounded card geometry, strong editorial headings, dark feature surfaces and restrained badges. Actual browser screenshots and interactive viewport inspection could not be captured because no browser session was available in the workspace. No screenshot links are fabricated. A final real-device/browser pass at the five requested sizes remains required.

## Known limitations

- Live Meta onboarding, template approval and message delivery still require external staging credentials and QA.
- Demo-request delivery requires configured Resend environment values; the existing API intentionally returns a service error without them.
- Proposed plan/store/user limits are presentation data, not enforced entitlements.
- There is no atomic inter-store transfer workflow, payment gateway settlement, full accounting, payroll, loyalty engine or enabled 2FA.
- No deployment was performed, as requested.
