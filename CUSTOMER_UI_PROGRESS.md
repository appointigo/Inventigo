# Customer Management UI Improvement

- [x] Audited directory, profile, analytics services, authorization and responsive behavior.
- [x] Replaced divergent KPI and directory calculations with one shared server-side population.
- [x] Added refund/exchange-aware integer-minor-unit spending calculations.
- [x] Added server-side customer groups, filtering, sorting, search and pagination.
- [x] Added five accessible, clickable KPI cards with matching directory totals.
- [x] Simplified responsive directory columns and added a mobile profile drawer.
- [x] Improved profile language, financial summary, shopping insights and demand labels.
- [x] Complete targeted lint, TypeScript production build and regression tests.
- [ ] Complete authenticated browser verification at representative viewport widths (browser session unavailable).

Root cause of the previous count mismatch: KPI cards and the directory used separate services. The KPI service applied store-aware purchase/preferred-store scope and return adjustments, while the directory used organization-wide denormalized Customer totals. Both surfaces now use `customerIntelligenceService.query` and therefore share the same population and definitions.
