import type { Theme } from "@emotion/react";
import { themeConfig } from "./themeConfig";

// ─── Light Theme ──────────────────────────────────────────────────────────────

export const lightTheme: Theme = {
  isDark: false,
  bg: {
    layout: themeConfig.light.bgLayout,
    surface: themeConfig.light.bgContainer,
    subtle: themeConfig.light.bgSubtle,
    muted: themeConfig.light.bgSubtle,
  },
  text: {
    primary: themeConfig.light.text,
    secondary: themeConfig.light.textSecondary,
    muted: themeConfig.light.textMuted,
    faint: themeConfig.light.textTertiary,
  },
  border: {
    primary: themeConfig.light.border,
    subtle: themeConfig.light.borderSecondary,
  },
};

// ─── Dark Theme ───────────────────────────────────────────────────────────────

export const darkTheme: Theme = {
  isDark: true,
  bg: {
    layout: themeConfig.dark.bgLayout,
    surface: themeConfig.dark.bgContainer,
    subtle: themeConfig.dark.bgSubtle,
    muted: themeConfig.dark.bgSubtle,
  },
  text: {
    primary: themeConfig.dark.text,
    secondary: themeConfig.dark.textSecondary,
    muted: themeConfig.dark.textMuted,
    faint: themeConfig.dark.textTertiary,
  },
  border: {
    primary: themeConfig.dark.border,
    subtle: themeConfig.dark.borderSecondary,
  },
};
