/**
 * ColoredButton Component
 * Button with custom color support and accessible contrast
 * Automatically generates hover/active states based on base color
 */

import React, { useMemo, useState, useCallback } from "react";
import { getColorHex } from "@/shared/theme/colorService";
import {
  getContrastingTextColor,
  lightenColor,
  darkenColor,
} from "@/shared/theme/colorUtils";

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
    const [isHovering, setIsHovering] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    // Memoize color calculations
    const hexColor = useMemo(() => getColorHex(colorHex, "#3B82F6"), [colorHex]);
    const textColor = useMemo(
      () => getContrastingTextColor(hexColor),
      [hexColor]
    );
    const hoverColor = useMemo(() => lightenColor(hexColor, 12), [hexColor]);
    const activeColor = useMemo(() => darkenColor(hexColor, 12), [hexColor]);

    // Size mappings
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    // Memoize styles
    const computedStyle = useMemo((): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        borderRadius: "6px",
        fontWeight: 500,
        transition: "all 0.2s ease-out",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...style,
      };

      const variantStyle: React.CSSProperties =
        variant === "solid"
          ? {
              backgroundColor: isPressed
                ? activeColor
                : isHovering
                  ? hoverColor
                  : hexColor,
              color: textColor,
              border: "none",
            }
          : variant === "outline"
            ? {
                backgroundColor: "transparent",
                color: hexColor,
                borderColor: isPressed
                  ? activeColor
                  : isHovering
                    ? hoverColor
                    : hexColor,
                border: `2px solid`,
              }
            : {
                backgroundColor: isHovering ? "rgba(0,0,0,0.05)" : "transparent",
                color: hexColor,
                border: "none",
              };

      return { ...baseStyle, ...variantStyle };
    }, [variant, isHovering, isPressed, hexColor, textColor, hoverColor, activeColor, disabled, style]);

    const handleMouseEnter = useCallback(() => {
      if (!disabled && !isLoading) setIsHovering(true);
    }, [disabled, isLoading]);

    const handleMouseLeave = useCallback(() => {
      setIsHovering(false);
      setIsPressed(false);
    }, []);

    const handleMouseDown = useCallback(() => {
      if (!disabled && !isLoading) setIsPressed(true);
    }, [disabled, isLoading]);

    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    return (
      <button
        ref={ref}
        className={`${sizeClasses[size]} font-medium rounded transition-all ${className}`}
        style={computedStyle}
        disabled={disabled || isLoading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            {loadingIndicator || (
              <span
                className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
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
