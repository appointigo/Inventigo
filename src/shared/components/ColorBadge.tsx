/**
 * ColorBadge Component
 * Displays a colored badge with accessible contrast
 * Automatically calculates best text color (black/white) for given background
 */

import React from "react";
import { getColorHex } from "@/shared/theme/colorService";

interface ColorBadgeProps {
  /** Color hex value or name */
  color: string;

  /** Badge text content */
  children: React.ReactNode;

  /** Optional CSS class */
  className?: string;

  /** Badge variant */
  variant?: "solid" | "outline" | "soft";

  /** Badge size */
  size?: "sm" | "md" | "lg";

  /** Optional onClick handler */
  onClick?: () => void;

  /** Whether badge is disabled */
  disabled?: boolean;

  /** Optional title/tooltip */
  title?: string;
}

/**
 * Helper: Determine if text should be white or black based on background brightness
 * Uses relative luminance calculation (simplified)
 */
const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace("#", "");

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Calculate relative luminance
  const luminance =
    0.299 * r +
    0.587 * g +
    0.114 * b;

  // Return white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export const ColorBadge = React.forwardRef<HTMLDivElement, ColorBadgeProps>(
  (
    {
      color,
      children,
      className = "",
      variant = "solid",
      size = "md",
      onClick,
      disabled = false,
      title,
    },
    ref
  ) => {
    // Get hex color (handles color names)
    const hexColor = getColorHex(color, "#999999");
    const textColor = getContrastColor(hexColor);

    // Size mappings
    const sizeClasses = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm",
      lg: "px-4 py-2 text-base",
    };

    // Variant styles
    const variantStyles = {
      solid: {
        backgroundColor: hexColor,
        color: textColor,
        border: "none",
      },
      outline: {
        backgroundColor: "transparent",
        color: hexColor,
        border: `2px solid ${hexColor}`,
      },
      soft: {
        backgroundColor: `${hexColor}20`, // 20% opacity
        color: hexColor,
        border: "none",
      },
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center justify-center rounded-full font-medium transition-opacity ${
          sizeClasses[size]
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        style={variantStyles[variant]}
        onClick={!disabled ? onClick : undefined}
        title={title}
        role="badge"
        aria-disabled={disabled}
      >
        {children}
      </div>
    );
  }
);

ColorBadge.displayName = "ColorBadge";
