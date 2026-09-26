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
- Mobile pricing navigation: closes the menu and reaches `#pricing`
- Plan comparison disclosure: opens successfully
- FAQ disclosure: opens successfully
- Mobile form input size: 16 px
- Interactive demo destination: `/demo`
- Production build: passed

The machine-readable results are in [after-results.json](screenshots/after-results.json). The audit deliberately excludes the off-screen `website` anti-spam honeypot from visible-control clipping checks.

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

The screenshot directory also contains every other tested size. Baseline desktop captures were taken from the development server and final captures from the production server, so their full-page pixel dimensions differ because the development run rendered a different runtime content height. Desktop preservation is therefore established by source scope: every visual CSS change is inside media queries capped at 1199 px, while the only component changes add mobile-menu behavior and accessibility metadata.

## Remaining manual checks

- Verify safe-area spacing and browser chrome behavior on physical iOS Safari and Android Chrome devices.
- Verify touch scrolling and keyboard behavior on real phones and tablets.
- Recheck third-party/local font rasterization in the production hosting environment.

No deployment was performed.
