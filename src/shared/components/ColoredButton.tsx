/**
 * ColoredButton Component
 * Button with custom color support and accessible contrast
 * Automatically generates hover/active states based on base color
 */

import React from "react";
import { getColorHex } from "@/shared/theme/colorService";

interface ColoredButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Color hex value or name */
  colorHex?: string;

  /** Button text/content */
  children: React.ReactNode;

  /** Button size */
  size?: "sm" | "md" | "lg";

  /** Button variant */
  variant?: "solid" | "outline" | "ghost";

  /** Whether button is loading */
  isLoading?: boolean;

  /** Loading spinner element */
  loadingIndicator?: React.ReactNode;
}

/**
 * Helper: Determine if text should be white or black based on background brightness
 */
const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace("#", "");

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Helper: Lighten color by mixing with white
 */
const lightenColor = (hex: string, percent: number = 20): string => {
  const hexClean = hex.replace("#", "");
  const r = parseInt(hexClean.substring(0, 2), 16);
  const g = parseInt(hexClean.substring(2, 4), 16);
  const b = parseInt(hexClean.substring(4, 6), 16);

  const lighter = (channel: number) =>
    Math.round(channel + (255 - channel) * (percent / 100));

  const newR = lighter(r).toString(16).padStart(2, "0");
  const newG = lighter(g).toString(16).padStart(2, "0");
  const newB = lighter(b).toString(16).padStart(2, "0");

  return `#${newR}${newG}${newB}`;
}

/**
 * Helper: Darken color by mixing with black
 */
const darkenColor = (hex: string, percent: number = 20): string => {
  const hexClean = hex.replace("#", "");
  const r = parseInt(hexClean.substring(0, 2), 16);
  const g = parseInt(hexClean.substring(2, 4), 16);
  const b = parseInt(hexClean.substring(4, 6), 16);

  const darker = (channel: number) =>
    Math.round(channel - channel * (percent / 100));

  const newR = darker(r).toString(16).padStart(2, "0");
  const newG = darker(g).toString(16).padStart(2, "0");
  const newB = darker(b).toString(16).padStart(2, "0");

  return `#${newR}${newG}${newB}`;
}

export const ColoredButton = React.forwardRef<
  HTMLButtonElement,
  ColoredButtonProps
>(
  (
    {
      colorHex = "#3B82F6",
      children,
      size = "md",
      variant = "solid",
      isLoading = false,
      loadingIndicator,
      disabled,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    // Get hex color (handles color names)
    const hexColor = getColorHex(colorHex, "#3B82F6");
    const textColor = getContrastColor(hexColor);
    const hoverColor = lightenColor(hexColor, 15);
    const activeColor = darkenColor(hexColor, 15);

    // Size mappings
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    // Base button style
    const baseStyle: React.CSSProperties = {
      borderRadius: "6px",
      fontWeight: 500,
      transition: "all 0.2s ease",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      ...style,
    };

    // Variant styles
    const variantStyle: React.CSSProperties =
      variant === "solid"
        ? {
            backgroundColor: hexColor,
            color: textColor,
            border: "none",
          }
        : variant === "outline"
          ? {
              backgroundColor: "transparent",
              color: hexColor,
              border: `2px solid ${hexColor}`,
            }
          : {
              backgroundColor: "transparent",
              color: hexColor,
              border: "none",
            };

    return (
      <button
        ref={ref}
        className={`${sizeClasses[size]} font-medium rounded transition-all ${className}`}
        style={{
          ...baseStyle,
          ...variantStyle,
        }}
        disabled={disabled || isLoading}
        onMouseEnter={(e) => {
          if (!disabled && !isLoading) {
            const target = e.currentTarget;
            if (variant === "solid") {
              target.style.backgroundColor = hoverColor;
            } else if (variant === "outline") {
              target.style.borderColor = hoverColor;
              target.style.color = hoverColor;
            } else {
              target.style.opacity = "0.8";
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isLoading) {
            const target = e.currentTarget;
            if (variant === "solid") {
              target.style.backgroundColor = hexColor;
            } else if (variant === "outline") {
              target.style.borderColor = hexColor;
              target.style.color = hexColor;
            } else {
              target.style.opacity = "1";
            }
          }
        }}
        onMouseDown={(e) => {
          if (!disabled && !isLoading) {
            const target = e.currentTarget;
            if (variant === "solid") {
              target.style.backgroundColor = activeColor;
            } else if (variant === "outline") {
              target.style.borderColor = activeColor;
              target.style.color = activeColor;
            }
          }
        }}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            {loadingIndicator || (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

ColoredButton.displayName = "ColoredButton";
