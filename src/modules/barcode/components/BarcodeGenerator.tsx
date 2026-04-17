"use client";

import { useEffect, useRef, memo } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeGeneratorProps {
  value: string;
  format?: "ean13" | "upca" | "code128";
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

/**
 * Barcode Generator Component
 * Renders EAN-13, UPC-A, or CODE-128 barcodes using jsbarcode library
 * Optimized for client-side performance and production use
 *
 * @param value - Barcode value (numeric for EAN-13/UPC-A, alphanumeric for CODE-128)
 * @param format - Barcode format (default: ean13)
 * @param width - SVG width in pixels (default: 200)
 * @param height - SVG height in pixels (default: 100)
 * @param displayValue - Show barcode text below image (default: true)
 * @param fontSize - Font size for displayed text (default: 14)
 */
const BarcodeGenerator = memo(
  ({
    value,
    format = "ean13",
    width = 200,
    height = 100,
    displayValue = true,
    fontSize = 14,
  }: BarcodeGeneratorProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Guard: no ref or no value
      if (!svgRef.current || !value?.trim()) {
        if (errorRef.current) {
          errorRef.current.style.display = "none";
        }
        if (svgRef.current) {
          svgRef.current.innerHTML = "";
        }
        return;
      }

      try {
        // Map format to jsbarcode format string
        const formatMap: Record<string, "EAN13" | "UPC" | "CODE128"> = {
          ean13: "EAN13",
          upca: "UPC",
          code128: "CODE128",
        };

        const barcodeFormat = formatMap[format] || "EAN13";

        // Render barcode to SVG
        JsBarcode(svgRef.current, value.trim(), {
          format: barcodeFormat,
          width: 2,
          height: Math.max(height * 0.5, 30),
          displayValue,
          fontSize: Math.max(fontSize, 10),
          margin: 5,
          lineColor: "#000000",
        });

        // Hide error message on success
        if (errorRef.current) {
          errorRef.current.style.display = "none";
        }
      } catch (error) {
        // Show error message
        const errorMessage =
          error instanceof Error ? error.message : "Invalid barcode format";

        if (errorRef.current) {
          errorRef.current.textContent = `Failed: ${errorMessage}`;
          errorRef.current.style.display = "block";
        }

        // Clear SVG on error
        if (svgRef.current) {
          svgRef.current.innerHTML = "";
        }

        console.error(`[BarcodeGenerator] ${format}:`, errorMessage);
      }
    }, [value, format, height, displayValue, fontSize]);

    return (
      <div style={{ textAlign: "center" }}>
        <svg
          ref={svgRef}
          style={{
            maxWidth: `${width}px`,
            maxHeight: `${height}px`,
            display: "inline-block",
          }}
        />
        <div
          ref={errorRef}
          style={{
            padding: "8px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#7f1d1d",
            display: "none",
            marginTop: "4px",
          }}
        />
      </div>
    );
  }
);

BarcodeGenerator.displayName = "BarcodeGenerator";

export default BarcodeGenerator;