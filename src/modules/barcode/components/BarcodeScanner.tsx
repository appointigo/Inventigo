"use client";

import { useEffect, useRef, useCallback } from "react";
import { Alert } from "antd";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannedRef = useRef(false);

  const handleScan = useCallback(
    (decodedText: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      onScan(decodedText);
      // Reset after a delay to allow re-scanning
      setTimeout(() => {
        scannedRef.current = false;
      }, 2000);
    },
    [onScan]
  );

  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      const { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

      if (!mounted || !containerRef.current) return;

      const scanner = new Html5QrcodeScanner(
        "barcode-scanner-region",
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Ignore "NotFound" which fires every frame when no barcode detected
          if (!errorMessage.includes("NotFound") && onError) {
            onError(errorMessage);
          }
        }
      );

      scannerRef.current = scanner;
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        (scannerRef.current as { clear: () => Promise<void> })
          .clear()
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [handleScan, onError]);

  return (
    <>
      <Alert
        title="Point your camera at a barcode to scan"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <div id="barcode-scanner-region" ref={containerRef} />
    </>
  );
}
