"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import dynamic from "next/dynamic";
import { Modal, Spin } from "antd";
import {
  BulbOutlined,
  CameraOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  ReloadOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useCameraScanner } from "@/modules/barcode/hooks/useCameraScanner";
import {
  ScannerWrapper,
  ScannerRegion,
  ScanLineOverlay,
  StatusBanner,
  LiveDot,
  TorchBtn,
  ScanTip,
  StartCameraBtn,
  IdleSplash,
  IdleSplashIcon,
  IdleSplashText,
  RetryRow,
  RetryBtn,
  PermissionHint,
} from "./CameraBarcodeScannerModal.styled";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CameraBarcodeScannerModalProps {
  open: boolean;
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

// ─── Inner scanner — rendered only on client, never SSR ──────────────────────

function ScannerInner({
  elementId,
  onScan,
  onClose,
}: {
  elementId: string;
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const { isSupported, state, isScanning, torchOn, torchAvailable, error, startScan, stopScan, toggleTorch } =
    useCameraScanner();

  // Track whether the user has explicitly clicked "Start Camera" yet
  const userStartedRef = useRef(false);

  // Cleanup camera stream when modal unmounts
  useEffect(() => {
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doStartScan = useCallback(() => {
    userStartedRef.current = true;
    startScan(elementId, (text) => {
      onScan(text);
      // Auto-close after a short delay so the user sees the success state
      setTimeout(onClose, 900);
    });
  }, [elementId, startScan, onScan, onClose]);

  // ── Idle splash: shown before the user clicks "Start Camera" ──────────────
  if (!isSupported) {
    return (
      <ScannerWrapper>
        <StatusBanner $variant="error">
          <CloseCircleFilled />
          Camera access is not supported in this browser.
        </StatusBanner>
        <ScanTip>Try Chrome, Firefox, or Safari on a device with a camera.</ScanTip>
      </ScannerWrapper>
    );
  }

  if (state === "idle") {
    return (
      <ScannerWrapper>
        <IdleSplash>
          <IdleSplashIcon>
            <CameraOutlined />
          </IdleSplashIcon>
          <IdleSplashText>
            Your browser will ask for camera permission.
            <br />
            Click <strong>Allow</strong> when prompted.
          </IdleSplashText>
          <StartCameraBtn type="button" onClick={doStartScan}>
            <CameraOutlined /> Start Camera
          </StartCameraBtn>
        </IdleSplash>
        <ScanTip>Supports CODE-128, EAN-13, UPC-A, CODE-39 &amp; QR codes.</ScanTip>
      </ScannerWrapper>
    );
  }

  if (state === "error") {
    const isPermissionError = error === "PERMISSION_DENIED";
    const displayError = isPermissionError
      ? "Camera permission denied."
      : (error ?? "Could not start the camera.");

    return (
      <ScannerWrapper>
        <StatusBanner $variant="error">
          <CloseCircleFilled />
          {displayError}
        </StatusBanner>

        {isPermissionError && (
          <PermissionHint>
            <strong>Steps to fix:</strong>
            <ol>
              <li>
                <strong>Allow in Chrome:</strong> click the camera icon{" "}
                <span style={{ fontSize: 11, opacity: 0.75 }}>(🔒 or 📷)</span> in the address bar → <strong>Allow</strong>,
                then click <strong>Try Again</strong> below.
              </li>
              <li>
                <strong>macOS system permission:</strong> System Settings →
                Privacy &amp; Security → Camera → tick your browser
                (Chrome / Safari / Edge). Then reload the page.
              </li>
              <li>
                <strong>Safari:</strong> Safari menu → Settings for This
                Website → Camera → Allow.
              </li>
            </ol>
          </PermissionHint>
        )}

        <RetryRow>
          <RetryBtn type="button" onClick={doStartScan}>
            <ReloadOutlined /> Try Again
          </RetryBtn>
          {isPermissionError && (
            <RetryBtn
              type="button"
              onClick={() => window.location.reload()}
              style={{ background: "#f0f4ff", borderColor: "#a5b4fc", color: "#3730a3" }}
            >
              <SyncOutlined /> Reload Page
            </RetryBtn>
          )}
        </RetryRow>
        <ScanTip>Supports CODE-128, EAN-13, UPC-A, CODE-39 &amp; QR codes.</ScanTip>
      </ScannerWrapper>
    );
  }

  // ── Requesting / Scanning / Success ────────────────────────────────────────
  return (
    <ScannerWrapper>
      {state === "requesting" && (
        <StatusBanner $variant="requesting">
          <Spin indicator={<LoadingOutlined />} size="small" />
          Requesting camera access…
        </StatusBanner>
      )}
      {state === "scanning" && (
        <StatusBanner $variant="scanning">
          <LiveDot />
          Scanning — aim camera at a barcode
        </StatusBanner>
      )}
      {state === "success" && (
        <StatusBanner $variant="success">
          <CheckCircleFilled />
          Barcode detected!
        </StatusBanner>
      )}

      {/* Camera region — @zxing/browser attaches its stream to the <video> element */}
      <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
        <ScannerRegion>
          <video
            id={elementId}
            playsInline
            muted
            style={{ width: "100%", display: "block" }}
          />
        </ScannerRegion>
        {isScanning && <ScanLineOverlay />}
      </div>

      {/* Torch toggle — only shown when scanning and torch is available */}
      {isScanning && torchAvailable && (
        <TorchBtn $on={torchOn} onClick={toggleTorch} type="button">
          <BulbOutlined />
          {torchOn ? "Torch On" : "Torch Off"}
        </TorchBtn>
      )}

      <ScanTip>
        Supports CODE-128, EAN-13, UPC-A, CODE-39 &amp; QR codes.
        <br />
        Keep the barcode well-lit and centred in the frame.
      </ScanTip>
    </ScannerWrapper>
  );
}

// Dynamically import so the wrapper never renders on server (avoids SSR issues
// with `navigator`, `getUserMedia`, and html5-qrcode's DOM assumptions).
const ScannerInnerDynamic = dynamic(() => Promise.resolve(ScannerInner), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 40, textAlign: "center" }}>
      <Spin />
    </div>
  ),
});

// ─── Public component ─────────────────────────────────────────────────────────

export default function CameraBarcodeScannerModal({
  open,
  onScan,
  onClose,
}: CameraBarcodeScannerModalProps) {
  // Stable unique DOM id for html5-qrcode to mount the video element into.
  // Using useId ensures no collision even when multiple instances are rendered.
  const rawId = useId();
  // useId may produce ":r0:" style ids — sanitise to a valid HTML id
  const elementId = `cam-scanner-${rawId.replace(/[^a-zA-Z0-9-_]/g, "")}`;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Scan Barcode via Camera"
      width={520}
      centered
      destroyOnHidden
      styles={{
        body: { paddingTop: 8, paddingBottom: 16 },
      }}
    >
      {/* Only render the scanner when the modal is open — prevents a stopped
          scanner from trying to run in a hidden, detached DOM node */}
      {open && (
        <ScannerInnerDynamic
          elementId={elementId}
          onScan={onScan}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
