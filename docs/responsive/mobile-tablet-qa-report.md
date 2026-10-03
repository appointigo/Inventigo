# Mobile and tablet landing-page QA report

Audit date: 26 September 2026  
Page: `/`  
Result: Pass

## Outcome

The public landing page now has dedicated phone and tablet behavior without changing its desktop layout rules. The final production-browser matrix found no page-level horizontal overflow and no visible interactive controls clipped at any tested viewport.

The most important visual correction is the phone dashboard preview: it now fills the card instead of leaving a large blank area beside a fixed-width mock sidebar. Tablet hero, feature, pricing, comparison, form, FAQ, and footer layouts now reflow intentionally rather than inheriting dense desktop grids.

## Tested viewports

- Phones: 320×700, 360×800, 375×812, 390×844, 430×932, 480×854, 600×960
- Landscape phones/small tablets: 700×320, 844×390
- Tablets: 768×1024, 820×1180, 834×1194, 1024×768, 1180×820
- Desktop regression: 1280×800, 1440×900, 1920×1080

## Automated results

- Horizontal overflow: none at all 17 viewport sizes
- Visible clipped links, buttons, inputs, selects, or textareas: none
- Mobile menu: opens and closes successfully
- Mobile menu: locks background scrolling and dismisses with Escape
- Mobile pricing navigation: closes the menu and reaches `#pricing`
- Plan comparison disclosure: opens successfully
- FAQ disclosure: opens successfully
- Mobile form input size: 16 px
- Demo booking form: mocked success response displays confirmation, re-enables submission, and resets fields
- Demo booking form: mocked server failure displays the API error and re-enables submission
- Landing-page links: no missing same-page anchors or unsupported local destinations
- Interactive demo destination: `/demo`
- Production build: passed

The original machine-readable viewport results are in [after-results.json](screenshots/after-results.json). The expanded interaction and form results are in [stable-after-results.json](screenshots/stable-after-results.json). The audit deliberately excludes the off-screen `website` anti-spam honeypot from visible-control clipping checks.

## Screenshot evidence

Representative comparisons:

| Viewport | Before | After |
|---|---|---|
| 320×700 | [before](screenshots/before-320x700.png) | [after](screenshots/after-320x700.png) |
| 390×844 | [before](screenshots/before-390x844.png) | [after](screenshots/after-390x844.png) |
| 820×1180 | [before](screenshots/before-820x1180.png) | [after](screenshots/after-820x1180.png) |
| 1180×820 | [before](screenshots/before-1180x820.png) | [after](screenshots/after-1180x820.png) |
| 1280×800 | [before](screenshots/before-1280x800.png) | [after](screenshots/after-1280x800.png) |
| 1440×900 | [before](screenshots/before-1440x900.png) | [after](screenshots/after-1440x900.png) |
| 1920×1080 | [before](screenshots/before-1920x1080.png) | [after](screenshots/after-1920x1080.png) |

The screenshot directory also contains every other tested size. The original baseline desktop captures were taken from the development server and final captures from the production server, so those older pairs have different runtime content heights and are not suitable for pixel comparison.

A second deterministic production-mode desktop pass was therefore captured before and after the final QA-only changes:

| Viewport | Stable baseline | Stable final | Pixel result |
|---|---|---|---|
| 1280×800 | [baseline](screenshots/stable-before-1280x800.png) | [final](screenshots/stable-after-1280x800.png) | Exact match |
| 1440×900 | [baseline](screenshots/stable-before-1440x900.png) | [final](screenshots/stable-after-1440x900.png) | Exact match |
| 1920×1080 | [baseline](screenshots/stable-before-1920x1080.png) | [final](screenshots/stable-after-1920x1080.png) | No channel differed by more than 3/255; no channel differed by more than the 5/255 anti-aliasing threshold |

Desktop preservation is also enforced by source scope: every visual CSS change is inside media queries capped at 1199 px, while the component changes only add mobile-menu behavior and accessibility metadata.

## Files modified

- `src/app/LandingPage.module.css`: isolated mobile and tablet layout rules
- `src/app/LandingPage.tsx`: mobile-menu accessibility, Escape dismissal, and scroll locking
- `scripts/responsive-landing-qa.mjs`: viewport, overflow, interaction, link, and form-state tests
- `docs/responsive/responsive-audit.md`: baseline findings and responsive changes
- `docs/responsive/mobile-tablet-qa-report.md`: final evidence and limitations
- `docs/responsive/screenshots/`: before, after, deterministic desktop, and machine-readable QA artifacts

## Components tested

Header/menu, hero, industry cards, feature cards, workflow, product mockups, customer proof, pricing plans, optional add-ons, feature comparison, interactive-demo CTAs, booking form, FAQ, final CTA, and footer.

## Remaining manual checks

- Verify safe-area spacing and browser chrome behavior on physical iOS Safari and Android Chrome devices.
- Verify touch scrolling and keyboard behavior on real phones and tablets.
- Recheck third-party/local font rasterization in the production hosting environment.
- WebKit was not available in the project environment; Chromium was used for automated browser testing.
- The in-app browser had no connected browser instance, so visual verification used the repository's Puppeteer/Chromium installation.
- No real-device testing was performed; all device checks used browser viewport emulation.

## Final engineering checks

- TypeScript (`npx tsc --noEmit`): passed
- Targeted ESLint for the landing page and responsive QA harness: passed
- Production build (`npm run build`): passed
- Pricing-catalog tests: 5 passed, 0 failed
- Responsive Chromium smoke/interaction/form suite: passed
- Desktop production screenshot comparison: passed
- Repository-wide ESLint: could not pass because the existing repository contains 164 errors and 93 warnings outside this landing-page task. The task-modified files pass targeted ESLint; unrelated lint findings were not changed.
- `git diff --check`: passed

No deployment was performed.
