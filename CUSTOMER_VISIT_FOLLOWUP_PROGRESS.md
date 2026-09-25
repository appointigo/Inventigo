# Customer Visit and Follow-up Integration

- [x] Audit existing customer, visit, demand, follow-up, auth and query flows.
- [x] Extend the additive follow-up domain model and relations.
- [x] Complete scoped services and customer-specific APIs.
- [x] Implement persistent Record Visit UI from customer profiles.
- [x] Implement persistent Create Follow-up UI and engagement actions.
- [x] Add anonymous, existing-customer and quick-registration identity choices to Demand Intelligence visit capture.
- [x] Add conservative same-store, exact-product/size restock opportunities to customer demand.
- [x] Verify Prisma schema, targeted lint/tests and production build.
- [x] Apply `20260926120000_add_followup_creator` to the configured Neon database.
- [ ] Complete authenticated browser/database journey checks against seeded test data.

The existing `CustomerVisit` and `DemandRequest` workflow remains the single source of truth. Anonymous visits remain valid and existing preferred-store ownership is reused.

The two earlier customer-intelligence migrations are already applied in the configured database and were left immutable. Creator attribution is therefore delivered as a third additive migration with a guarded backfill. No promotional WhatsApp action is triggered by visits, demand, follow-ups or restock matching.
