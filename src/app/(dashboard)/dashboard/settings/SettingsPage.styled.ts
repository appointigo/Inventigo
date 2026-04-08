import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const paneFade = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Page shell ───────────────────────────────────────────────────────────────

export const SettingsWrap = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-layout);
`;

// ─── Dark gradient banner ─────────────────────────────────────────────────────

export const PageBanner = styled.div`
  background: linear-gradient(135deg, #1e293b 0%, #2d3a5e 50%, #1e3a8a 100%);
  padding: 28px 32px 0;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    right: 80px;
    top: -40px;
    width: 200px;
    height: 200px;
    background: rgba(37, 99, 235, 0.15);
    border-radius: 50%;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    right: -20px;
    top: 20px;
    width: 120px;
    height: 120px;
    background: rgba(79, 70, 229, 0.12);
    border-radius: 50%;
    pointer-events: none;
  }
`;

export const BannerRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  position: relative;
  z-index: 1;
`;

export const BannerH1 = styled.h1`
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 3px;
  line-height: 1.2;
`;

export const BannerSub = styled.p`
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
`;

export const BannerStats = styled.div`
  display: flex;
  gap: 28px;
  padding-bottom: 2px;
`;

export const BannerStat = styled.div`
  text-align: right;
`;

export const BannerStatVal = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: #fff;
`;

export const BannerStatLbl = styled.div`
  font-size: 11px;
  color: #93c5fd;
`;

// ─── Tab strip ────────────────────────────────────────────────────────────────

export const TabStrip = styled.div`
  display: flex;
  gap: 2px;
  padding: 14px 0 0;
  position: relative;
  z-index: 1;
`;

export const TabItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  color: ${(p) => (p.$active ? "#2563eb" : "#94a3b8")};
  background: ${(p) => (p.$active ? "var(--bg-layout)" : "transparent")};
  border-radius: 10px 10px 0 0;
  border: 1px solid ${(p) => (p.$active ? "rgba(255,255,255,0.1)" : "transparent")};
  border-bottom: 1px solid ${(p) => (p.$active ? "var(--bg-layout)" : "transparent")};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  position: relative;
  bottom: -1px;
  user-select: none;

  &:hover {
    ${(p) =>
      !p.$active &&
      `
      color: #e2e8f0;
      background: rgba(255, 255, 255, 0.06);
    `}
  }
`;

export const TabBadge = styled.span`
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.6;
`;

// ─── Content area ─────────────────────────────────────────────────────────────

export const PageContent = styled.div`
  flex: 1;
  padding: 28px 32px;
  background: var(--bg-layout);
`;

export const Pane = styled.div`
  animation: ${paneFade} 0.3s ease;
`;

// ─── Grid helpers ─────────────────────────────────────────────────────────────

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const StatGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols ?? 3}, 1fr);
  gap: 14px;
  margin-bottom: 18px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

// ─── Stat mini card ───────────────────────────────────────────────────────────

export const StatMini = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  }
`;

export const StatMiniIcon = styled.span`
  font-size: 22px;
  flex-shrink: 0;
`;

export const StatMiniVal = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
`;

export const StatMiniLbl = styled.div`
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 2px;
`;

// ─── Profile card ─────────────────────────────────────────────────────────────

export const ProfileCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

export const ProfileHero = styled.div`
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    right: -30px;
    top: -30px;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    right: 20px;
    bottom: -50px;
    width: 130px;
    height: 130px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    pointer-events: none;
  }
`;

export const ProfileAvatar = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2.5px solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
`;

export const ProfileName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  position: relative;
  z-index: 1;
`;

export const ProfileEmail = styled.div`
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
  position: relative;
  z-index: 1;
`;

export const ProfileRows = styled.div``;

export const ProfileRow = styled.div`
  display: flex;
  align-items: center;
  padding: 13px 24px;
  border-bottom: 1px solid var(--border-subtle);
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

export const ProfileLbl = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  width: 110px;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

export const ProfileVal = styled.span`
  font-size: 13.5px;
  color: var(--text-primary);
  font-weight: 500;
`;

export const ProfileValMono = styled.span`
  font-size: 11.5px;
  color: var(--text-muted);
  font-family: monospace;
`;

export const InfoBox = styled.div`
  margin: 0 24px 24px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  font-size: 12.5px;
  color: #3730a3;
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ─── Generic section card ─────────────────────────────────────────────────────

export const SectionCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

export const SectionHead = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  p {
    font-size: 12px;
    color: var(--text-muted);
    margin: 2px 0 0;
  }
`;

export const SectionBody = styled.div`
  padding: 24px;
`;

// ─── Security items (profile tab) ─────────────────────────────────────────────

export const SecurityItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-primary);
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }

  strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  small {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 2px;
    display: block;
  }
`;

// ─── Billing tab ──────────────────────────────────────────────────────────────

export const BillingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const InvoicePreviewBox = styled.div`
  background: var(--bg-subtle);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  border: 1px solid var(--border-primary);
  margin-bottom: 16px;
`;

export const InvoicePreviewLabel = styled.div`
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
`;

export const InvoiceNumber = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: monospace;
  letter-spacing: -0.5px;
  word-break: break-all;
`;

export const InvoiceFormat = styled.div`
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
`;

export const WarningBox = styled.div`
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 12.5px;
  color: #92400e;
`;
