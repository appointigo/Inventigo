"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScannerState = "idle" | "requesting" | "scanning" | "success" | "error";

export interface UseCameraScannerReturn {
  isSupported: boolean;
  state: ScannerState;
  isScanning: boolean;
  torchOn: boolean;
  torchAvailable: boolean;
  error: string | null;
  startScan: (elementId: string, onScan: (text: string) => void) => Promise<void>;
  stopScan: () => Promise<void>;
  toggleTorch: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectCameraSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function friendlyError(err: unknown): string {
  // DOMException carries the error type in .name, not .message
  const name = (err instanceof Error && "name" in err) ? (err as DOMException).name : "";
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[useCameraScanner]", name, msg);

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    msg.includes("NotAllowedError") ||
    msg.includes("PermissionDeniedError") ||
    msg.includes("Permission denied")
  ) {
    return "PERMISSION_DENIED";
  }
  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    msg.includes("NotFoundError") ||
    msg.includes("DevicesNotFoundError") ||
    msg.includes("Requested device not found") ||
    msg.includes("no cameras")
  ) {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError" || msg.includes("NotReadableError")) {
    return "Camera is in use by another application. Please close it and try again.";
  }
  if (name === "OverconstrainedError" || msg.includes("OverconstrainedError")) {
    return "No suitable camera found. Please try a different browser or device.";
  }
  return `Could not start the camera: ${msg}`;
}

interface ScannerControls {
  stop: () => void;
  switchTorch?: (onOff: boolean) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCameraScanner(): UseCameraScannerReturn {
  const [isSupported] = useState<boolean>(detectCameraSupport);
  const [state, setState] = useState<ScannerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  const controlsRef = useRef<ScannerControls | null>(null);
  // Prevents concurrent startScan calls (React 19 Strict Mode double-invoke)
  const startingRef = useRef(false);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      startingRef.current = false;
      const c = controlsRef.current;
      controlsRef.current = null;
      if (c) try { c.stop(); } catch { /* ignore */ }
    };
  }, []);

  // ── startScan ──────────────────────────────────────────────────────────────
  const startScan = useCallback(
    async (elementId: string, onScan: (text: string) => void) => {
      if (!isSupported) {
        setError("Camera access is not supported in this browser.");
        setState("error");
        return;
      }

      if (startingRef.current) return;
      startingRef.current = true;

      // Stop any previous scan immediately
      const prev = controlsRef.current;
      controlsRef.current = null;
      if (prev) try { prev.stop(); } catch { /* ignore */ }

      setState("requesting");
      setError(null);
      setTorchOn(false);
      setTorchAvailable(false);

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hints = new Map<any, any>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ]);
        // TRY_HARDER dramatically improves 1D barcode detection accuracy
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        // facingMode as { ideal } never throws OverconstrainedError:
        // it uses the rear camera on mobile, any camera on desktop.
        const controls: ScannerControls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          elementId,
          (result) => {
            if (result) {
              setState("success");
              onScan(result.getText());
            }
          },
        );

        // Guard: Strict Mode may have cancelled this start via cleanup
        if (!startingRef.current) {
          try { controls.stop(); } catch { /* ignore */ }
          return;
        }

        controlsRef.current = controls;
        setState("scanning");
        startingRef.current = false;

        // Torch support is signalled by the presence of switchTorch on controls
        if (typeof controls.switchTorch === "function") {
          setTorchAvailable(true);
        }

      } catch (err: unknown) {
        setError(friendlyError(err));
        setState("error");
        startingRef.current = false;
      }
    },
    [isSupported],
  );

  // ── stopScan ───────────────────────────────────────────────────────────────
  const stopScan = useCallback(async () => {
    const c = controlsRef.current;
    controlsRef.current = null;
    setState("idle");
    setTorchOn(false);
    setTorchAvailable(false);
    setError(null);
    if (c) try { c.stop(); } catch { /* ignore */ }
  }, []);

  // ── toggleTorch ────────────────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const c = controlsRef.current;
    if (!c?.switchTorch || !torchAvailable) return;
    const next = !torchOn;
    try {
      await c.switchTorch(next);
      setTorchOn(next);
    } catch { /* torch toggle failed silently */ }
  }, [torchOn, torchAvailable]);

  return {
    isSupported,
    state,
    isScanning: state === "scanning",
    torchOn,
    torchAvailable,
    error,
    startScan,
    stopScan,
    toggleTorch,
  };
}

