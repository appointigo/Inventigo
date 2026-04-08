# Theme Architecture

## Overview

Stockiva uses a **dual-layer theming system**: Ant Design's token system controls all AntD components, while Emotion's `ThemeProvider` makes typed design tokens available to every custom styled component via `p.theme`.

A CSS custom-properties bridge (`[data-theme]` on `<html>`) covers the remaining edge cases — Ant Design nested popups, third-party libraries (html5-qrcode), and inline JSX styles.

---

## Layer 1 — Emotion ThemeProvider (custom components)

### Token file
**`src/shared/theme/tokens.ts`**

Single source of truth for all design token values. Exports two objects typed as `Theme`:

```ts
lightTheme: Theme  // light mode values
darkTheme:  Theme  // dark mode values
```

### Theme shape

```ts
interface Theme {
  isDark: boolean;

  bg: {
    layout:  string;   // page/app background
    surface: string;   // cards, panels, modals
    subtle:  string;   // inputs, row hover, secondary areas
    muted:   string;   // pill backgrounds, kbd keys
  };

  text: {
    primary:   string; // headings, main values
    secondary: string; // body text
    muted:     string; // labels, hints
    faint:     string; // placeholders, meta
  };

  border: {
    primary: string;   // card/panel borders, dividers
    subtle:  string;   // row separators, section separators
  };
}
```

### Token values

| Token                | Light         | Dark          |
|----------------------|---------------|---------------|
| `bg.layout`          | `#f5f5f5`     | `#0f172a`     |
| `bg.surface`         | `#ffffff`     | `#1e293b`     |
| `bg.subtle`          | `#f8fafc`     | `#243447`     |
| `bg.muted`           | `#f3f4f6`     | `#334155`     |
| `text.primary`       | `#111827`     | `#f1f5f9`     |
| `text.secondary`     | `#374151`     | `#cbd5e1`     |
| `text.muted`         | `#6b7280`     | `#94a3b8`     |
| `text.faint`         | `#9ca3af`     | `#64748b`     |
| `border.primary`     | `#e5e7eb`     | `#334155`     |
| `border.subtle`      | `#f3f4f6`     | `#1e293b`     |

### TypeScript augmentation
**`src/types/emotion.d.ts`** — augments `@emotion/react`'s `Theme` interface so `p.theme` is fully typed in every styled component.

### Provider setup
**`src/providers/ThemeProvider.tsx`**

```tsx
<ThemeModeContext.Provider value={{ mode, setMode }}>
  <ConfigProvider theme={antdThemeConfig}>
    <App>
      <EmotionThemeProvider theme={isDark ? darkTheme : lightTheme}>
        {children}
      </EmotionThemeProvider>
    </App>
  </ConfigProvider>
</ThemeModeContext.Provider>
```

### Usage in styled components

```ts
import styled from "@emotion/styled";

export const Card = styled.div`
  background: ${p => p.theme.bg.surface};
  border: 1px solid ${p => p.theme.border.primary};
  color: ${p => p.theme.text.primary};
`;
```

---

## Layer 2 — Ant Design tokens (AntD components)

Configured in `ThemeProvider.tsx` via `<ConfigProvider theme={...}>`.  
Uses `antTheme.darkAlgorithm` / `antTheme.defaultAlgorithm` to recolour all Ant Design components automatically.

Key token overrides (dark values shown):

| AntD Token              | Dark Value   | Light Value  |
|-------------------------|--------------|--------------|
| `colorBgContainer`      | `#1e293b`    | `#ffffff`    |
| `colorBgLayout`         | `#0f172a`    | `#f5f5f5`    |
| `colorBgElevated`       | `#1e293b`    | `#ffffff`    |
| `colorBorder`           | `#334155`    | `#d9d9d9`    |
| `colorText`             | `#f1f5f9`    | `#0f172a`    |
| `colorTextSecondary`    | `#94a3b8`    | `#64748b`    |

---

## Layer 3 — CSS Custom Properties (edge cases)

**`src/app/globals.css`**

The `data-theme` attribute on `<html>` (set by ThemeProvider's `useEffect`) switches a full set of CSS custom properties. These cover:

- **Inline `style={}` JSX** props (e.g. `StockTable.tsx` render functions where `p.theme` is unavailable)
- **Third-party libraries** that inject their own HTML (e.g. html5-qrcode)
- **Ant Design nested content** (popovers, drawups) that escape the styled-component tree

```css
:root, [data-theme="light"] {
  --bg-layout:      #f5f5f5;
  --bg-surface:     #ffffff;
  --bg-subtle:      #f8fafc;
  --bg-muted:       #f3f4f6;
  --text-primary:   #111827;
  --text-secondary: #374151;
  --text-muted:     #6b7280;
  --text-faint:     #9ca3af;
  --border-primary: #e5e7eb;
  --border-subtle:  #f3f4f6;
}

[data-theme="dark"] {
  --bg-layout:      #0f172a;
  --bg-surface:     #1e293b;
  --bg-subtle:      #243447;
  --bg-muted:       #334155;
  --text-primary:   #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted:     #94a3b8;
  --text-faint:     #64748b;
  --border-primary: #334155;
  --border-subtle:  #1e293b;
}
```

---

## Theme Mode

Three modes are supported: `"light"`, `"dark"`, `"system"`.

- Stored in `localStorage` under the key `"stockiva-theme"`
- Resolved to `isDark: boolean` via `window.matchMedia("(prefers-color-scheme: dark)")` for `"system"` mode
- Read/written via the `useThemeMode()` hook: `{ mode, setMode }`

```ts
import { useThemeMode } from "@/providers/ThemeProvider";

const { mode, setMode } = useThemeMode();
setMode("dark"); // persists to localStorage
```

---

## Files Summary

| File | Purpose |
|------|---------|
| `src/shared/theme/tokens.ts` | Light & dark token objects (single source of truth) |
| `src/types/emotion.d.ts` | TypeScript augmentation for `@emotion/react` Theme interface |
| `src/providers/ThemeProvider.tsx` | Mounts all three theme layers; exposes `useThemeMode()` |
| `src/app/globals.css` | CSS custom properties for inline styles & third-party libs |

---

## Adding a new styled component

1. Import `styled` from `@emotion/styled`
2. Use `p.theme.*` for all colors — **no hardcoded hex values**
3. If you need a value that isn't in the token shape, add it to `tokens.ts` and `emotion.d.ts` first

```ts
// ✅ Correct
export const MyCard = styled.div`
  background: ${p => p.theme.bg.surface};
  color: ${p => p.theme.text.primary};
  border: 1px solid ${p => p.theme.border.primary};
`;

// ❌ Wrong — breaks dark mode
export const MyCard = styled.div`
  background: #ffffff;
  color: #111827;
`;
```

---

## Extending the token shape

1. Add the new key to `src/types/emotion.d.ts` inside the `Theme` interface
2. Add the light and dark values to `lightTheme` / `darkTheme` in `src/shared/theme/tokens.ts`
3. Add matching CSS custom properties to `src/app/globals.css`
4. Use in styled components: `${p => p.theme.newSection.newKey}`
