/**
 * Theme Configuration
 * Centralized semantic organization of colors for component consumption
 * Single source of truth for all UI color usage
 * 
 * Structure:
 * - colors: Semantic color groups for component usage
 * - spacing: Standardized spacing scale
 * - typography: Standardized font styles
 * 
 * Import: import { themeConfig } from '@/shared/theme/themeConfig'
 * Usage: style={{ color: themeConfig.colors.text }}
 */

import { COLOR_PALETTE } from './colors';

export const themeConfig = {
  colors: {
    // ─────────────────────────────────────────────────────────────────────
    // PRIMARY ACTION COLORS
    // ─────────────────────────────────────────────────────────────────────
    primary: COLOR_PALETTE.blue_50.hex,
    primaryDark: COLOR_PALETTE.blue_600.hex,
    primaryLight: COLOR_PALETTE.blue_light.hex,
    primarySupporting: COLOR_PALETTE.sky_blue.hex,

    // ─────────────────────────────────────────────────────────────────────
    // SEMANTIC STATUS COLORS
    // ─────────────────────────────────────────────────────────────────────
    success: COLOR_PALETTE.green_50.hex,
    successDark: COLOR_PALETTE.success_dark.hex,
    successLight: COLOR_PALETTE.green_light.hex,

    error: COLOR_PALETTE.red_50.hex,
    errorDark: COLOR_PALETTE.error_dark.hex,
    errorLight: COLOR_PALETTE.rose_50.hex,

    warning: COLOR_PALETTE.orange_50.hex,
    warningDark: COLOR_PALETTE.warning_dark.hex,
    warningLight: COLOR_PALETTE.amber_50.hex,

    info: COLOR_PALETTE.cyan_50.hex,
    infoDark: COLOR_PALETTE.info_dark.hex,
    infoLight: COLOR_PALETTE.cyan_light.hex,

    // ─────────────────────────────────────────────────────────────────────
    // NEUTRAL & SURFACE COLORS
    // ─────────────────────────────────────────────────────────────────────
    white: COLOR_PALETTE.white.hex,
    black: COLOR_PALETTE.black.hex,
    background: COLOR_PALETTE.gray_50.hex,
    surface: COLOR_PALETTE.white.hex,
    surfaceSubtle: COLOR_PALETTE.gray_100.hex,

    // ─────────────────────────────────────────────────────────────────────
    // BORDER & DIVIDER COLORS
    // ─────────────────────────────────────────────────────────────────────
    border: COLOR_PALETTE.gray_200.hex,
    borderLight: COLOR_PALETTE.gray_100.hex,
    borderDark: COLOR_PALETTE.gray_300.hex,

    // ─────────────────────────────────────────────────────────────────────
    // TEXT COLORS
    // ─────────────────────────────────────────────────────────────────────
    text: COLOR_PALETTE.gray_700.hex,
    textSecondary: COLOR_PALETTE.gray_500.hex,
    textTertiary: COLOR_PALETTE.gray_600.hex,
    textMuted: COLOR_PALETTE.gray_400.hex,
    textInverse: COLOR_PALETTE.white.hex,

    // ─────────────────────────────────────────────────────────────────────
    // PRODUCT/VARIANT COLORS (For T-shirts, apparel color variants)
    // ─────────────────────────────────────────────────────────────────────
    productColors: {
      red: COLOR_PALETTE.product_red.hex,
      darkRed: COLOR_PALETTE.red_600.hex,
      blue: COLOR_PALETTE.product_blue.hex,
      darkBlue: COLOR_PALETTE.blue_600.hex,
      black: COLOR_PALETTE.product_black.hex,
      white: COLOR_PALETTE.product_white_off.hex,
      navy: COLOR_PALETTE.product_navy.hex,
      green: COLOR_PALETTE.product_green.hex,
      gray: COLOR_PALETTE.product_gray.hex,
      brown: COLOR_PALETTE.product_brown.hex,
      pink: COLOR_PALETTE.product_pink.hex,
      orange: COLOR_PALETTE.product_orange.hex,
    },

    // ─────────────────────────────────────────────────────────────────────
    // CATEGORY/ACCENT COLORS (For Tags, badges, category management)
    // Maps to Ant Design tag colors for consistency
    // ─────────────────────────────────────────────────────────────────────
    accents: {
      blue: COLOR_PALETTE.blue_50.hex,
      gold: COLOR_PALETTE.gold_50.hex,
      green: COLOR_PALETTE.green_50.hex,
      cyan: COLOR_PALETTE.cyan_50.hex,
      purple: COLOR_PALETTE.purple_50.hex,
      red: COLOR_PALETTE.red_50.hex,
      orange: COLOR_PALETTE.orange_50.hex,
      magenta: COLOR_PALETTE.magenta_50.hex,
      volcano: COLOR_PALETTE.orange_600.hex, // Ant Design volcano
      lime: COLOR_PALETTE.lime.hex,
      geekblue: COLOR_PALETTE.indigo_50.hex, // Ant Design geekblue
    },

    // ─────────────────────────────────────────────────────────────────────
    // PREMIUM & ACCENT COLORS
    // ─────────────────────────────────────────────────────────────────────
    premium: COLOR_PALETTE.gold_50.hex,
    premiumAlt: COLOR_PALETTE.purple_50.hex,
    accent: COLOR_PALETTE.magenta_50.hex,
    accentLight: COLOR_PALETTE.pink_50.hex,
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },

  typography: {
    h1: { fontSize: '32px', fontWeight: 700, lineHeight: '40px' },
    h2: { fontSize: '24px', fontWeight: 600, lineHeight: '32px' },
    h3: { fontSize: '18px', fontWeight: 600, lineHeight: '28px' },
    h4: { fontSize: '16px', fontWeight: 600, lineHeight: '24px' },
    body: { fontSize: '14px', fontWeight: 400, lineHeight: '22px' },
    bodySmall: { fontSize: '12px', fontWeight: 400, lineHeight: '20px' },
    caption: { fontSize: '11px', fontWeight: 400, lineHeight: '16px' },
  },

  borderRadius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // ─────────────────────────────────────────────────────────────────────
  // DARK MODE COLORS (for light mode override in dark theme)
  // ─────────────────────────────────────────────────────────────────────
  dark: {
    // Background colors optimized for dark mode
    bgLayout: '#0f172a',        // Deep slate - main layout background
    bgContainer: '#1e293b',     // Medium slate - cards, containers
    bgElevated: '#1e293b',      // Same as container for consistency
    bgSubtle: '#243447',        // Slightly lighter - subtle containers
    
    // Border colors optimized for dark mode
    border: '#334155',          // Slate border
    borderSecondary: '#1e293b', // Subtle border
    
    // Text colors optimized for dark mode
    text: '#f1f5f9',            // Light slate - primary text
    textSecondary: '#cbd5e1',   // Medium slate - secondary text
    textTertiary: '#94a3b8',    // Muted slate - tertiary text
    textMuted: '#64748b',       // Very muted - helper text
  },

  // ─────────────────────────────────────────────────────────────────────
  // LIGHT MODE COLORS (explicit for clarity)
  // ─────────────────────────────────────────────────────────────────────
  light: {
    // Background colors optimized for light mode
    bgLayout: COLOR_PALETTE.gray_50.hex,     // Very light gray - main layout
    bgContainer: COLOR_PALETTE.white.hex,    // White - cards, containers
    bgElevated: COLOR_PALETTE.white.hex,     // Same as container
    bgSubtle: COLOR_PALETTE.gray_100.hex,    // Subtle - subtle backgrounds
    
    // Border colors optimized for light mode
    border: COLOR_PALETTE.gray_200.hex,      // Light gray border
    borderSecondary: COLOR_PALETTE.gray_100.hex, // Subtle border
    
    // Text colors optimized for light mode
    text: COLOR_PALETTE.gray_700.hex,        // Dark gray - primary text
    textSecondary: COLOR_PALETTE.gray_500.hex, // Medium gray - secondary text
    textTertiary: COLOR_PALETTE.gray_600.hex,  // Slightly lighter - tertiary
    textMuted: COLOR_PALETTE.gray_400.hex,     // Very light - helper text
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// TYPE EXPORTS FOR TYPESCRIPT
// ─────────────────────────────────────────────────────────────────────

export type ThemeConfig = typeof themeConfig;
export type ColorKey = keyof typeof themeConfig.colors;
export type AccentColorKey = keyof typeof themeConfig.colors.accents;
export type ProductColorKey = keyof typeof themeConfig.colors.productColors;
export type SpacingKey = keyof typeof themeConfig.spacing;
export type TypographyKey = keyof typeof themeConfig.typography;
export type BorderRadiusKey = keyof typeof themeConfig.borderRadius;
export type ShadowKey = keyof typeof themeConfig.shadows;
