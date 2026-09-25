# Customer Quick View & Full Profile — Implementation Checkpoint

## Audit

- The customer directory is implemented in `dashboard/customers/page.tsx` and `CustomerList.tsx`.
- The existing desktop profile is a non-modal docked panel; tablet/mobile use Ant Design Drawer.
- Customer details use `/api/customers/[id]` with organization and optional store authorization enforced by `requireOrgAuth` and `customerService.getCustomerById`.
- TanStack Query keys are centralized in `customerQueries.ts`; detail requests are keyed by stable customer ID and receive abort signals.
- `CustomerDetailView` already contains all five requested profile sections and the existing Edit, Visit and Follow-up actions.
- Customer forms, visit recording and follow-up creation are reusable and must not be rebuilt.
- The missing pieces are a dedicated profile route, compact Quick View, name links and URL-backed directory restoration.

## Implementation direction

- Keep the authorized detail API and customer metrics as the single data source.
- Introduce a compact `CustomerQuickView` while retaining `CustomerDetailView` for the full page.
- Add `/dashboard/customers/[customerId]` using the stable database ID.
- Encode non-sensitive directory controls in the Customers URL and pass a validated return path into profile links.
- Preserve existing query invalidation after edits, visits and follow-ups.

## Completed

- Added the dedicated `/dashboard/customers/[customerId]` full-profile route.
- Added compact Quick View with real metrics, recent purchase/demand and existing actions.
- Customer names link directly to the full profile without triggering row Quick View.
- Directory state is URL-backed and restored on return, including KPI, store, search, filters, sort and pagination.
- Full-profile tabs are URL-backed; direct loading, refresh and Back/Forward navigation are supported.
- Existing tenant/store authorization remains centralized in `/api/customers/[id]`.
- Existing detail data now includes sale store/items/payment/return status and recorded visits without schema changes.
- Added regression tests for directory-state round trips, safe return paths and stable-ID profile links.

## Pagination and Quick View regression fix

- Restored the compact docked Quick View as the customer-row action while preserving customer-name links to the full profile.
- Fixed Ant Table pagination events incorrectly reapplying the controlled sorter and resetting the page to one.
- Removed previous-page placeholder records during page transitions and deferred the first directory query until URL state is restored.
- Page-size changes now reset to page one; ordinary page changes preserve all active filters and sorting.
- Added deterministic customer-ID tie-breaking, page clamping and `totalPages` response metadata.
