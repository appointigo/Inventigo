/**
 * Advanced Color Hooks - Phase 2
 * Async hooks for color operations using chroma-js and color naming
 * All hooks are memoized and optimized for performance
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { getVariations, getContrast, isAccessible, getHarmony, getColorScale, getColorInfo, getContrastingText } from "./colorServiceAdvanced";
import { getColorNameFromHex, getColorMetadata, inferSemanticFromColor, findSimilarColors, extractAndNameColors, extractColorsFromCanvas, analyzePaletteAccessibility } from "./colorNaming";
import type { ColorVariations, WCAGLevel } from "../types/colors";

// ─────────────────────────────────────────────────────────────────────
// SYNCHRONOUS HOOKS (Phase 2)
// ─────────────────────────────────────────────────────────────────────

/**
 * Hook: Get color variations (tints, shades, disabled)
 * Memoized to prevent recalculation
 *
 * @param hex - Hex color
 * @returns ColorVariations object
 *
 * @example
 * const variations = useColorVariations("#EF4444");
 * return <div style={{ background: variations.tint }}>Hover effect</div>;
 */
export const useColorVariations = (hex: string): ColorVariations => {
  return useMemo(() => getVariations(hex), [hex]);
};

/**
 * Hook: Calculate contrast ratio between two colors
 *
 * @param foreground - Foreground color
 * @param background - Background color
 * @returns Contrast ratio (1-21)
 *
 * @example
 * const ratio = useContrast("#000000", "#FFFFFF");
 * console.log(ratio); // 21
 */
export const useContrast = (foreground: string, background: string): number => {
  return useMemo(() => getContrast(foreground, background), [foreground, background]);
};

/**
 * Hook: Check accessibility (WCAG compliance)
 *
 * @param foreground - Foreground color
 * @param background - Background color
 * @param level - WCAG level ("AA" or "AAA")
 * @returns true if meets standard
 *
 * @example
 * const isAccessible = useIsAccessible("#000000", "#FFFFFF", "AA");
 */
export const useIsAccessible = (
  foreground: string,
  background: string,
  level: WCAGLevel = "AA"
): boolean => {
  return useMemo(() => isAccessible(foreground, background, level), [
    foreground,
    background,
    level,
  ]);
};

/**
 * Hook: Get contrasting text color for background
 *
 * @param backgroundColor - Background color
 * @returns "#000000" or "#FFFFFF"
 *
 * @example
 * const textColor = useContrastingText("#EF4444");
 */
export const useContrastingText = (backgroundColor: string): string => {
  return useMemo(() => getContrastingText(backgroundColor), [backgroundColor]);
};

/**
 * Hook: Get color harmony/scheme
 *
 * @param hex - Base color
 * @param type - Harmony type (complementary, triadic, analogous, tetradic)
 * @returns Array of harmonious colors
 *
 * @example
 * const harmony = useColorHarmony("#EF4444", "triadic");
 */
export const useColorHarmony = (
  hex: string,
  type: "complementary" | "triadic" | "analogous" | "tetradic" = "complementary"
): string[] => {
  return useMemo(() => getHarmony(hex, type), [hex, type]);
};

/**
 * Hook: Get color scale/gradient
 *
 * @param color1 - Start color
 * @param color2 - End color
 * @param steps - Number of steps
 * @returns Array of interpolated colors
 *
 * @example
 * const scale = useColorScale("#FF0000", "#0000FF", 5);
 */
export const useColorScale = (
  color1: string,
  color2: string,
  steps: number = 5
): string[] => {
  return useMemo(() => getColorScale(color1, color2, steps), [color1, color2, steps]);
};

/**
 * Hook: Get comprehensive color information
 *
 * @param hex - Hex color
 * @returns Color info (RGB, HSL, brightness, saturation, etc.)
 *
 * @example
 * const info = useColorInfo("#EF4444");
 * console.log(info.isBright, info.saturation);
 */
export const useColorInfo = (hex: string) => {
  return useMemo(() => getColorInfo(hex), [hex]);
};

// ─────────────────────────────────────────────────────────────────────
// ASYNC HOOKS (Phase 2) - Color Naming
// ─────────────────────────────────────────────────────────────────────

/**
 * Hook: Get color name from hex (async)
 * Handles exact and fuzzy matching
 *
 * @param hex - Hex color
 * @returns { name, loading, error }
 *
 * @example
 * const { name, loading } = useColorName("#EF4444");
 * if (loading) return <Spinner />;
 * return <div>{name}</div>; // "Red"
 */
export const useColorName = (
  hex: string
): { name: string | null; loading: boolean; error: Error | null } => {
  const [state, setState] = useState<{
    name: string | null;
    loading: boolean;
    error: Error | null;
  }>({
    name: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Simulate async operation for consistency
      const name = getColorNameFromHex(hex, 15);
      setState({ name, loading: false, error: null });
    } catch (error) {
      setState({
        name: null,
        loading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      });
    }
  }, [hex]);

  return state;
};

/**
 * Hook: Get complete color metadata (name, semantic, category)
 *
 * @param hex - Hex color
 * @returns { metadata, loading, error }
 *
 * @example
 * const { metadata, loading } = useColorMetadata("#EF4444");
 * if (loading) return <Spinner />;
 * return <div>{metadata.name} - {metadata.semantic}</div>;
 */
export const useColorMetadata = (
  hex: string
): {
  metadata: ReturnType<typeof getColorMetadata> | null;
  loading: boolean;
  error: Error | null;
} => {
  const [state, setState] = useState<{
    metadata: ReturnType<typeof getColorMetadata> | null;
    loading: boolean;
    error: Error | null;
  }>({
    metadata: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const metadata = getColorMetadata(hex);
      setState({ metadata, loading: false, error: null });
    } catch (error) {
      setState({
        metadata: null,
        loading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      });
    }
  }, [hex]);

  return state;
};

/**
 * Hook: Infer semantic meaning from color
 *
 * @param hex - Hex color
 * @returns { semantic, loading }
 *
 * @example
 * const { semantic } = useInferSemantic("#EF4444");
 * // semantic = "error"
 */
export const useInferSemantic = (
  hex: string
): { semantic: string | null; loading: boolean } => {
  const [state, setState] = useState<{
    semantic: string | null;
    loading: boolean;
  }>({
    semantic: null,
    loading: true,
  });

  useEffect(() => {
    try {
      const semantic = inferSemanticFromColor(hex);
      setState({ semantic, loading: false });
    } catch {
      setState({ semantic: null, loading: false });
    }
  }, [hex]);

  return state;
};

/**
 * Hook: Find similar colors from palette
 *
 * @param hex - Reference color
 * @param limit - Max results
 * @returns { colors, loading }
 *
 * @example
 * const { colors } = useSimilarColors("#EF4444", 5);
 */
export const useSimilarColors = (hex: string, limit: number = 5) => {
  const [state, setState] = useState<{
    colors: ReturnType<typeof findSimilarColors>;
    loading: boolean;
  }>({
    colors: [],
    loading: true,
  });

  useEffect(() => {
    try {
      const colors = findSimilarColors(hex, limit, 20);
      setState({ colors, loading: false });
    } catch {
      setState({ colors: [], loading: false });
    }
  }, [hex, limit]);

  return state;
};

// ─────────────────────────────────────────────────────────────────────
// ADVANCED ASYNC HOOKS
// ─────────────────────────────────────────────────────────────────────

/**
 * Hook: Extract and name multiple colors
 *
 * @param hexColors - Array of hex colors
 * @returns { results, loading }
 *
 * @example
 * const { results } = useExtractColors(["#EF4444", "#3B82F6"]);
 */
export const useExtractColors = (hexColors: string[]) => {
  const [state, setState] = useState<{
    results: ReturnType<typeof extractAndNameColors>;
    loading: boolean;
  }>({
    results: [],
    loading: true,
  });

  useEffect(() => {
    try {
      const results = extractAndNameColors(hexColors);
      setState({ results, loading: false });
    } catch {
      setState({ results: [], loading: false });
    }
  }, [hexColors.join(",")]); // Join to avoid dependency array issues

  return state;
};

/**
 * Hook: Extract colors from canvas element
 *
 * @param canvasRef - Ref to canvas element
 * @returns { colors, loading, error, extractColors }
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * const { colors, extractColors } = useCanvasColors(canvasRef);
 */
export const useCanvasColors = (
  canvasRef: React.RefObject<HTMLCanvasElement>
): {
  colors: string[];
  loading: boolean;
  error: Error | null;
  extractColors: () => void;
} => {
  const [state, setState] = useState<{
    colors: string[];
    loading: boolean;
    error: Error | null;
  }>({
    colors: [],
    loading: false,
    error: null,
  });

  const extractColors = useCallback(() => {
    if (!canvasRef.current) {
      setState({
        colors: [],
        loading: false,
        error: new Error("Canvas ref not available"),
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));
      const colors = extractColorsFromCanvas(canvasRef.current, 100);
      setState({ colors, loading: false, error: null });
    } catch (error) {
      setState({
        colors: [],
        loading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      });
    }
  }, [canvasRef]);

  return { ...state, extractColors };
};

/**
 * Hook: Analyze color palette for accessibility
 *
 * @param foregroundColors - Array of text colors to test
 * @param backgroundColor - Background color
 * @returns { analysis, loading }
 *
 * @example
 * const { analysis } = usePaletteAccessibility(
 *   ["#000000", "#FFFFFF"],
 *   "#FFFFFF"
 * );
 */
export const usePaletteAccessibility = (
  foregroundColors: string[],
  backgroundColor: string
) => {
  const [state, setState] = useState<{
    analysis: ReturnType<typeof analyzePaletteAccessibility> | null;
    loading: boolean;
  }>({
    analysis: null,
    loading: true,
  });

  useEffect(() => {
    try {
      const analysis = analyzePaletteAccessibility(foregroundColors, backgroundColor);
      setState({ analysis, loading: false });
    } catch {
      setState({ analysis: null, loading: false });
    }
  }, [foregroundColors.join(","), backgroundColor]);

  return state;
};
