import styled from "@emotion/styled";
import { keyframes, css } from "@emotion/react";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`;

const successPop = keyframes`
  0%   { transform: scale(0.85); opacity: 0; }
  60%  { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
`;

const scanLine = keyframes`
  0%   { top: 10%; }
  50%  { top: 85%; }
  100% { top: 10%; }
`;

// ─── Viewport wrapper ─────────────────────────────────────────────────────────

export const ScannerWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
`;

// ─── The div that html5-qrcode mounts into ────────────────────────────────────

export const ScannerRegion = styled.div`
  width: 100%;
  max-width: 480px;
  border-radius: 16px;
  overflow: hidden;
  background: #000;

  /* Strip html5-qrcode default chrome */
  img[alt="Info icon"] { display: none !important; }
  button { display: none !important; }
  select { display: none !important; }

  /* Give the inner video element rounded corners */
  video {
    border-radius: 14px;
    object-fit: cover;
  }
`;

// ─── Scan-line animation overlay ──────────────────────────────────────────────

export const ScanLineOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 100%;
  pointer-events: none;
  border-radius: 16px;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    left: 16px;
    right: 16px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
    border-radius: 1px;
    animation: ${scanLine} 2.2s ease-in-out infinite;
    box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.6);
  }
`;

// ─── State banners ────────────────────────────────────────────────────────────

export const StatusBanner = styled.div<{
  $variant: "scanning" | "success" | "error" | "requesting";
}>`
  width: 100%;
  max-width: 480px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  ${({ $variant }) => {
    switch ($variant) {
      case "requesting":
        return css`
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        `;
      case "scanning":
        return css`
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        `;
      case "success":
        return css`
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #15803d;
          animation: ${successPop} 0.3s ease both;
        `;
      case "error":
        return css`
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        `;
    }
  }}
`;

// ─── Pulsing dot beside "Scanning…" ──────────────────────────────────────────

export const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

// ─── Torch toggle button ──────────────────────────────────────────────────────

export const TorchBtn = styled.button<{ $on: boolean }>`
  background: ${({ $on }) => ($on ? "#fbbf24" : "rgba(255,255,255,0.12)")};
  border: 1.5px solid ${({ $on }) => ($on ? "#f59e0b" : "rgba(255,255,255,0.25)")};
  color: ${({ $on }) => ($on ? "#78350f" : "#fff")};
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.18s;

  &:hover {
    background: ${({ $on }) => ($on ? "#fde68a" : "rgba(255,255,255,0.22)")};
  }
`;

// ─── Tip text ─────────────────────────────────────────────────────────────────

export const ScanTip = styled.p`
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  margin: 0;
  line-height: 1.5;
`;

// ─── Idle splash (shown before user clicks "Start Camera") ────────────────────

export const IdleSplash = styled.div`
  width: 100%;
  max-width: 480px;
  background: #f8faff;
  border: 1.5px dashed #bfdbfe;
  border-radius: 16px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
`;

export const IdleSplashIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: #fff;
`;

export const IdleSplashText = styled.p`
  font-size: 13.5px;
  color: #374151;
  line-height: 1.6;
  margin: 0;
`;

export const StartCameraBtn = styled.button`
  margin-top: 4px;
  padding: 10px 28px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;

  &:hover  { opacity: 0.92; }
  &:active { transform: scale(0.97); }
`;

// ─── Error state — retry row ──────────────────────────────────────────────────

export const RetryRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

export const RetryBtn = styled.button`
  padding: 8px 22px;
  background: #fff;
  border: 1.5px solid #2563eb;
  border-radius: 8px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #eff6ff; }
`;

export const PermissionHint = styled.div`
  width: 100%;
  max-width: 480px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.6;

  ul, ol {
    margin: 6px 0 0;
    padding-left: 18px;
  }

  li { margin-bottom: 4px; }
`;
