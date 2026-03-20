"use client";

import dynamic from "next/dynamic";

// react-barcode uses canvas/DOM APIs - must be client-only
const Barcode = dynamic(() => import("react-barcode"), { ssr: false });

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export default function BarcodeGenerator({
  value,
  width = 1.5,
  height = 50,
  displayValue = true,
  fontSize = 14,
}: BarcodeGeneratorProps) {
  return (
    <Barcode
      value={value}
      format="CODE128"
      width={width}
      height={height}
      displayValue={displayValue}
      fontSize={fontSize}
      margin={4}
      background="#ffffff"
      lineColor="#000000"
    />
  );
}
