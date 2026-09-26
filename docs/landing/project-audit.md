# Stockiva landing-page project audit

## Architecture

- Next.js 16.2 App Router, React 19.2 and TypeScript 5.
- Public root route is `src/app/page.tsx`; authenticated users are redirected into the existing admin, verification, onboarding or dashboard routes.
- Public authentication destination is `/login`; the POS application is rooted at `/dashboard`.
- UI stack: Ant Design 6, Emotion styled components and global CSS variables. The new marketing surface uses a route-local CSS module so its design rules do not leak into authenticated screens.
- Authentication is handled by NextAuth through `src/lib/auth` and `/api/auth/[...nextauth]`.

## Verified product surface

The repository contains implemented routes and services for billing, barcode lookup, products, categories, stock, customers, returns/exchanges, multi-store configuration, reports, suppliers and purchase orders. Marketing copy is restricted to those broad capabilities. Accessories, footwear and electronics are labelled planned rather than live.

## Existing assets and branding

The earlier public page used `public/stockiva_banner.png`, a cyan-on-dark palette and an emoji package mark. The reference establishes a materially different warm retail/editorial direction. The new page uses a small CSS-native leaf mark, generated unbranded retail photography, and a real-pattern interface mock built from the application's existing dashboard concepts.

## Forms and integrations

Resend is already used for authentication mail. The demo-request endpoint reuses the provider through environment configuration, adds server-side Zod validation, a honeypot and a conservative per-process request limit. No database schema or production transaction path was changed.
