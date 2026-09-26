# Visual QA report

## Status

Automated browser QA is blocked in this execution environment: the configured browser runtime reported no available browser instances after its required recovery check. No screenshots are claimed and `docs/landing/screenshots/` therefore intentionally contains no fabricated output.

## Source and build review

- Responsive layouts are explicitly defined for desktop, tablet and mobile breakpoints.
- The root, demo and form endpoint compile in the production build.
- Horizontal constraints are applied to hero, product mock, industry scroller, pricing, form and footer layouts.
- Reduced-motion behavior, semantic landmarks, labelled navigation, visible form labels and keyboard-native FAQ disclosure are implemented.

## Remaining comparison work

When a browser becomes available, capture 1440×900, 1280×800, 768×1024, 390×844 and 360×800. Complete three comparison passes focused on hero product-mock scale, hero image crop, headline wrapping, mobile industry-card width, form height and footer wrapping. Console, hydration, image-load and route interaction checks also remain browser-unverified.

## Known visual differences

- The reference shows a photographed laptop; the implementation uses a CSS-rendered product surface over retail photography so the application UI remains factual.
- The reference collage contains unverified testimonials and business metrics; those elements are omitted.
- The system font stack approximates the reference typeface without adding an external font dependency.
