"use client";

import { ConfigProvider, theme as antTheme } from "antd";
import type { ReactNode } from "react";

// Inventigo brand design tokens
const inventigoTheme = {
  token: {
    // Brand colors
    colorPrimary: "#1677ff",
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#ff4d4f",
    colorInfo: "#1677ff",

    // Typography
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,

    // Border
    borderRadius: 6,

    // Layout
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f5f5f5",
  },
  algorithm: antTheme.defaultAlgorithm,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={inventigoTheme}>{children}</ConfigProvider>;
}
