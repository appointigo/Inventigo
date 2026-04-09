import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Page header ────────────────────────────────────────────────────────────

export const PageTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  animation: ${fadeUp} 0.3s ease both;
`;

export const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: ${({ theme }) => theme.text.primary};
  margin: 0 0 3px;
`;

export const PageSubtitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.text.muted};
  margin: 0;
`;

export const BtnPrimary = styled.button`
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px #1677ff33;
  transition: background 0.15s;
  &:hover { background: #0958d9; }
`;

// ── Announcement list ──────────────────────────────────────────────────────

export const AnnList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ${fadeUp} 0.4s ease both;
`;

export const AnnCard = styled.div<{ ended?: boolean }>`
  background: ${({ theme }) => theme.bg.surface};
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  opacity: ${({ ended }) => (ended ? 0.55 : 1)};
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
`;

const STRIPE_COLORS: Record<string, string> = {
  INFO: "linear-gradient(90deg, #1677ff, #38bdf8)",
  WARNING: "linear-gradient(90deg, #d97706, #fbbf24)",
  CRITICAL: "linear-gradient(90deg, #dc2626, #f87171)",
};

export const AnnStripe = styled.div<{ severity: string }>`
  height: 4px;
  background: ${({ severity }) => STRIPE_COLORS[severity] || STRIPE_COLORS.INFO};
  ${({ severity }) =>
    severity !== "CRITICAL" && severity !== "WARNING" && severity !== "INFO"
      ? ""
      : ""}
`;

export const AnnBody = styled.div`
  padding: 18px 20px;
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-top: none;
  border-radius: 0 0 12px 12px;
`;

export const AnnTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`;

const SEVERITY_STYLES: Record<string, string> = {
  INFO: "background: #eff6ff; color: #1d4ed8;",
  WARNING: "background: #fffbeb; color: #d97706;",
  CRITICAL: "background: #fef2f2; color: #dc2626;",
};

export const SeverityBadge = styled.span<{ severity: string }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 4px;
  ${({ severity }) => SEVERITY_STYLES[severity] || SEVERITY_STYLES.INFO}
`;

export const Badge = styled.span<{ variant?: "green" | "gray" }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  ${({ variant }) =>
    variant === "green"
      ? "background: #f0fdf4; color: #16a34a;"
      : "background: #f3f4f6; color: #6b7280;"}
`;

export const AnnTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 4px;
`;

export const AnnMsg = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.text.muted};
  line-height: 1.6;
  margin-bottom: 12px;
`;

export const AnnFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.text.faint};
  flex-wrap: wrap;
`;

export const Divider = styled.span`
  color: ${({ theme }) => theme.border.primary};
`;

export const AnnActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 6px;
`;

export const ActionBtn = styled.button<{ danger?: boolean }>`
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.border.primary};
  background: ${({ theme }) => theme.bg.surface};
  color: ${({ theme }) => theme.text.muted};
  transition: all 0.15s;
  &:hover {
    border-color: ${({ danger }) => (danger ? "#dc2626" : "#1677ff")};
    color: ${({ danger }) => (danger ? "#dc2626" : "#1677ff")};
    ${({ danger }) => (danger ? "background: #fef2f2;" : "")}
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  animation: ${fadeUp} 0.4s ease both;
`;

export const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

export const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 4px;
`;

export const EmptyDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.text.faint};
`;
