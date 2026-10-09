"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseAnalyticsDateRange,
  resolveAnalyticsDateRange,
  type AnalyticsDatePreset,
  type AnalyticsDateRange,
} from "../utils/dateRange";

export function useAnalyticsDateRange(
  defaultPreset: AnalyticsDatePreset = "30d",
  allowedPresets?: readonly AnalyticsDatePreset[],
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialized = searchParams.toString();
  const range = useMemo(() => {
    const parsed = parseAnalyticsDateRange(new URLSearchParams(serialized), defaultPreset);
    return allowedPresets && !allowedPresets.includes(parsed.preset)
      ? resolveAnalyticsDateRange(defaultPreset)
      : parsed;
  }, [allowedPresets, defaultPreset, serialized]);
  const setRange = useCallback((next: AnalyticsDateRange) => {
    const params = new URLSearchParams(serialized);
    params.set("period", next.preset);
    if (next.preset === "custom") {
      params.set("from", next.from);
      params.set("to", next.to);
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, serialized]);

  const selectPreset = useCallback((preset: Exclude<AnalyticsDatePreset, "custom">) => {
    setRange(resolveAnalyticsDateRange(preset));
  }, [setRange]);

  const selectCustom = useCallback((from: string, to: string) => {
    setRange(resolveAnalyticsDateRange("custom", { from, to }));
  }, [setRange]);

  return { range, selectPreset, selectCustom };
}
