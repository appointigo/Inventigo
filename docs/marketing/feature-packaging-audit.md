# Stockiva marketing feature-packaging audit

**Date:** 26 September 2026  
**Branch:** `front-page-rewamp`

## Existing public experience

- The public route is `/`; authenticated visitors are redirected by `src/app/page.tsx` to the appropriate product area.
- `src/app/LandingPage.tsx` is the existing interactive client component. It already contains the approved hero, retail-industry strip, benefit grid, simulated product view, `/demo` CTA, booking form, pricing cards, FAQ and final CTA.
- `src/app/LandingPage.module.css` defines the approved cream, deep-green and dark retail visual language reflected in the supplied reference image. The implementation extends these tokens rather than introducing a new theme.
- `/demo` is a real simulated product route. Demo requests use `POST /api/demo-requests`, Zod validation, a honeypot, in-process rate limiting and Resend configuration. The upgraded pricing CTAs retain those destinations.

## Commercial-source audit

- The supplied catalog contains exactly 192 unique feature IDs: 121 core-plan proposals, 37 add-on proposals and 34 platform-internal capabilities.
- All 192 rows retain their audit status and commercial classification internally.
- No monthly or annual price is approved. `publishPrices` is false, plan prices are null and the public fallback is “Request Pricing.”
- Starter retains ordinary billing, split/partial payments, returns/exchanges and essential reporting.
- Growth inherits Starter. Business inherits Growth and adds proposed commercial scale rather than invented exclusive software.
- WhatsApp and Advanced Analytics are independent add-ons for every core plan.
- Public comparison excludes platform-internal capabilities and private audit limitations.

## Truthfulness discrepancies and safeguards

| Proposed claim | Repository evidence | Marketing handling |
|---|---|---|
| WhatsApp delivery | Substantial implementation exists, but live Meta delivery is unverified. | Draft preview only; production copy does not guarantee delivery and shows Meta charges separately. |
| Atomic stock transfers | No dedicated transfer workflow exists. | Not marketed as available; Growth multi-store copy explicitly avoids implying transfers. |
| Advanced analytics | Implemented analytics exist, but commercial launch approval is separate. | Optional add-on and draft/approval gated. |
| Loyalty, payroll, full accounting and 2FA | Partial, absent or disabled in the audit. | Not presented as live retailer benefits. |
| Business onboarding/support terms | Commercial proposal, not coded entitlement. | Labeled subject to agreement. |
| Pricing limits | Values are proposed and not enforced by backend entitlements. | Request Pricing only; no billing toggle or checkout. |
| Accessories, footwear and electronics | Industry-specific support is not fully launched. | Clearly labeled Planned; clothing/apparel remains Available now. |

## Implementation direction

The existing narrative and visual hierarchy remain intact. The former hardcoded pricing cards are replaced with validated, server-supplied plans, independent add-ons and a grouped accessible comparison. Development shows the full draft for owner review; production suppresses unapproved feature claims and retains roadmap items only as Planned.

