"use client";

import { ConfigProvider, App, theme as antTheme } from "antd";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

type ThemeModeContextType = {
  mode: ThemeMode;
  toggleMode: () => void;
};

export const ThemeModeContext = createContext<ThemeModeContextType>({
  mode: "light",
  toggleMode: () => {},
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  // Read persisted preference after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setMode(stored);
    }
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const isDark = mode === "dark";

  const themeConfig = {
    token: {
      ...baseTokens,
      colorBgContainer: isDark ? "#141414" : "#ffffff",
      colorBgLayout: isDark ? "#000000" : "#f5f5f5",
    },
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ConfigProvider theme={themeConfig}>
        <App>{children}</App>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeMode() {
  return useContext(ThemeModeContext);
}
