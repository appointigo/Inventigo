"use client";

import { ConfigProvider, App, theme as antTheme } from "antd";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { lightTheme, darkTheme } from "@/shared/theme/tokens";
import { themeConfig as colorTheme } from "@/shared/theme/themeConfig";

export type ThemeMode = "light" | "dark" | "system";

type ThemeModeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeModeContext = createContext<ThemeModeContextType>({
  mode: "light",
  setMode: () => {},
});

const STORAGE_KEY = "stockiva-theme";

/**
 * Base tokens for Ant Design theme
 * All color values are centrally defined in themeConfig (colors.ts)
 * This ensures single source of truth across entire application
 */
const baseTokens = {
  colorPrimary: colorTheme.colors.primary,      // "#1677FF"
  colorSuccess: colorTheme.colors.success,      // "#52C41A"
  colorWarning: colorTheme.colors.warning,      // "#FA8C16"
  colorError: colorTheme.colors.error,          // "#EF4444"
  colorInfo: colorTheme.colors.info,            // "#13C2C2"
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
  borderRadius: 6,
} as const;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [systemIsDark, setSystemIsDark] = useState(false);

  // Read persisted preference after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setModeState(stored);
    }
  }, []);

  // Track OS colour scheme for "system" mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener("change", handler);

    return () => mq.removeEventListener("change", handler);
  }, []);

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  };

  const isDark = mode === "dark" || (mode === "system" && systemIsDark);

  // Apply data-theme to <html> so CSS custom properties switch for Emotion components
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  /**
   * Ant Design theme configuration
   * Uses centralized themeConfig colors for both light and dark modes
   * Ensures single source of truth for all theme colors
   */
  const themeConfig = {
    token: {
      ...baseTokens,
      // Use centralized theme colors based on mode
      colorBgContainer: isDark ? colorTheme.dark.bgContainer : colorTheme.light.bgContainer,
      colorBgLayout: isDark ? colorTheme.dark.bgLayout : colorTheme.light.bgLayout,
      colorBgElevated: isDark ? colorTheme.dark.bgElevated : colorTheme.light.bgElevated,
      colorBorder: isDark ? colorTheme.dark.border : colorTheme.light.border,
      colorBorderSecondary: isDark ? colorTheme.dark.borderSecondary : colorTheme.light.borderSecondary,
      colorText: isDark ? colorTheme.dark.text : colorTheme.light.text,
      colorTextSecondary: isDark ? colorTheme.dark.textSecondary : colorTheme.light.textSecondary,
      colorTextTertiary: isDark ? colorTheme.dark.textTertiary : colorTheme.light.textTertiary,
    },
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
  };

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider theme={themeConfig}>
        <App>
          <EmotionThemeProvider theme={isDark ? darkTheme : lightTheme}>
            {children}
          </EmotionThemeProvider>
        </App>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => {
  return useContext(ThemeModeContext);
}
