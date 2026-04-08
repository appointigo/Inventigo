"use client";

import { ConfigProvider, App, theme as antTheme } from "antd";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { lightTheme, darkTheme } from "@/shared/theme/tokens";

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

const baseTokens = {
  colorPrimary: "#1677ff",
  colorSuccess: "#52c41a",
  colorWarning: "#faad14",
  colorError: "#ff4d4f",
  colorInfo: "#1677ff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
  borderRadius: 6,
};

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

  // Use slate-palette dark colours that pair well with Emotion's hardcoded values
  const themeConfig = {
    token: {
      ...baseTokens,
      colorBgContainer: isDark ? "#1e293b" : "#ffffff",
      colorBgLayout:    isDark ? "#0f172a" : "#f5f5f5",
      colorBgElevated:  isDark ? "#1e293b" : "#ffffff",
      colorBorder:      isDark ? "#334155" : "#d9d9d9",
      colorBorderSecondary: isDark ? "#1e293b" : "#f0f0f0",
      colorText:        isDark ? "#f1f5f9" : "#0f172a",
      colorTextSecondary: isDark ? "#94a3b8" : "#64748b",
      colorTextTertiary:  isDark ? "#64748b" : "#9ca3af",
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
