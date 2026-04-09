import type { Theme } from "@emotion/react";

// ─── Light Theme ──────────────────────────────────────────────────────────────

export const lightTheme: Theme = {
  isDark: false,
  bg: {
    layout:  "#f0f4f8",
    surface: "#ffffff",
    subtle:  "#f8fafc",
    muted:   "#f3f4f6",
  },
  text: {
    primary:   "#111827",
    secondary: "#374151",
    muted:     "#6b7280",
    faint:     "#9ca3af",
  },
  border: {
    primary: "#e5e7eb",
    subtle:  "#f3f4f6",
  },
};

// ─── Dark Theme ───────────────────────────────────────────────────────────────

export const darkTheme: Theme = {
  isDark: true,
  bg: {
    layout:  "#0f172a",
    surface: "#1e293b",
    subtle:  "#243447",
    muted:   "#334155",
  },
  text: {
    primary:   "#f1f5f9",
    secondary: "#cbd5e1",
    muted:     "#94a3b8",
    faint:     "#64748b",
  },
  border: {
    primary: "#334155",
    subtle:  "#1e293b",
  },
};
