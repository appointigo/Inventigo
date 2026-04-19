/**
 * ColorBadge Component
 * Displays a colored badge with accessible contrast
 * Automatically calculates best text color (black/white) for given background
 */

import React, { useMemo } from "react";
import { getColorHex } from "@/shared/theme/colorService";
import { getContrastingTextColor, hexToRgba } from "@/shared/theme/colorUtils";

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
    const hexColor = useMemo(() => getColorHex(color, "#999999"), [color]);
    const textColor = useMemo(
      () => getContrastingTextColor(hexColor),
      [hexColor]
    );

    // Size mappings
    const sizeClasses = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm",
      lg: "px-4 py-2 text-base",
    };

    // Variant styles
    const variantStyles = useMemo(
      () => ({
        solid: {
          backgroundColor: hexColor,
          color: textColor,
          border: "none" as const,
        },
        outline: {
          backgroundColor: "transparent",
          color: hexColor,
          border: `2px solid ${hexColor}`,
        },
        soft: {
          backgroundColor: hexToRgba(hexColor, 0.15), // 15% opacity
          color: hexColor,
          border: "none" as const,
        },
      }),
      [hexColor, textColor]
    );

    return (
      <div
        ref={ref}
        className={`inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 ${
          sizeClasses[size]
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md"} ${className}`}
        style={variantStyles[variant]}
        onClick={!disabled ? onClick : undefined}
        title={title}
        role="badge"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        {children}
      </div>
    );
  }
);

ColorBadge.displayName = "ColorBadge";
