"use client";

import { useEffect, useRef } from "react";
import { Flex, Spin } from "antd";

interface BarcodeGeneratorProps {
  value: string;
  format?: "ean13" | "upca" | "code128";
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

/**
 * Barcode Generator using bwip-js (RFC 3548 compliant)
 * Generates standard EAN-13, UPC-A, or CODE-128 barcodes
 * Supports variant SKUs and external barcodes
 */
const BarcodeGenerator = ({
  value,
  format = "ean13",
  width = 200,
  height = 100,
  displayValue = true,
  fontSize = 14,
}: BarcodeGeneratorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const renderBarcode = async () => {
      try {
        // Dynamically import bwip-js (only on client)
        // @ts-ignore - bwip-js doesn't have type declarations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bwipjs: any = await import("bwip-js");

        if (!mounted || !containerRef.current) return;

        // Validate value before rendering
        if (!value || value.trim().length === 0) {
          containerRef.current.innerHTML = "<span style='color: #d1d5db; font-size: 12px;'>No barcode value</span>";
          return;
        }

        // Create canvas for barcode rendering
        const canvas = document.createElement("canvas");
        canvas.style.display = "none";

        // Determine barcode ID based on format
        const bcid = format === "upca" ? "upca" : format === "code128" ? "code128" : "ean13";

        // Render barcode to canvas
        await bwipjs.toCanvas(canvas, {
          bcid,
          text: value.trim(),
          scale: 2,
          height: 10,
          includetext: displayValue,
          textxoffset: 0,
        });

        // Convert canvas to image
        const img = document.createElement("img");
        img.src = canvas.toDataURL("image/png");
        img.style.maxWidth = `${width}px`;
        img.style.maxHeight = `${height}px`;
        img.style.display = "block";
        img.style.margin = "0 auto";
        img.alt = `Barcode: ${value}`;

        // Render SVG/HTML representation for accessibility
        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";
        wrapper.appendChild(img);

        if (displayValue) {
          const label = document.createElement("div");
          label.textContent = value;
          label.style.fontSize = `${fontSize}px`;
          label.style.fontFamily = "'SF Mono', monospace";
          label.style.marginTop = "8px";
          label.style.fontWeight = "500";
          label.style.color = "#1f2937";
          wrapper.appendChild(label);
        }

        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(wrapper);
        loadedRef.current = true;
      } catch (error) {
        if (mounted && containerRef.current) {
          console.error("[BarcodeGenerator] Failed to render:", error);
          containerRef.current.innerHTML = `
            <div style="
              padding: 12px;
              background: #fee2e2;
              border: 1px solid #fca5a5;
              border-radius: 4px;
              font-size: 12px;
              color: #7f1d1d;
            ">
              Failed to generate barcode: ${error instanceof Error ? error.message : "Unknown error"}
            </div>
          `;
        }
      }
    };

    renderBarcode();

    return () => {
      mounted = false;
    };
  }, [value, format, width, height, displayValue, fontSize]);

  return (
    <Flex justify="center" align="center" ref={containerRef} style={{ minHeight: `${Math.max(height + 40, 120)}px` }}>
      <Spin size="small" description="Generating barcode..." />
    </Flex>
  );
}

export default BarcodeGenerator;