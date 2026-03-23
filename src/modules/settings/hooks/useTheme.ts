"use client";

import { useContext } from "react";
import { ThemeModeContext } from "@/providers/ThemeProvider";

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
