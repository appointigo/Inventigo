import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const growBar = keyframes`
  from { height: 0; }
`;

const growWidth = keyframes`
  from { width: 0 !important; }
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

export const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const BtnGhost = styled.button`
  background: ${({ theme }) => theme.bg.surface};
  color: ${({ theme }) => theme.text.muted};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  &:hover { border-color: #1677ff; color: #1677ff; }
`;

export const FilterSelect = styled.select`
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.text.muted};
  background: ${({ theme }) => theme.bg.surface};
  cursor: pointer;
  outline: none;
`;

// ── KPI grid ───────────────────────────────────────────────────────────────

export const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  animation: ${fadeUp} 0.35s ease both;
  @media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
`;

export const KPICard = styled.div<{ delay?: number }>`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 14px;
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  animation: ${fadeUp} 0.4s ${({ delay = 0 }) => delay}s ease both;
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
`;

export const KPIShine = styled.div<{ color: string }>`
  position: absolute; top: 0; right: 0;
  width: 90px; height: 90px; border-radius: 50%;
  background: ${({ color }) => color};
  opacity: 0.06; transform: translate(30px, -30px); pointer-events: none;
`;

export const KPIIcon = styled.div<{ bg: string; color: string }>`
  width: 38px; height: 38px; border-radius: 10px;
  background: ${({ bg }) => bg}; color: ${({ color }) => color};
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; margin-bottom: 12px;
`;

export const KPILabel = styled.div`
  font-size: 12px; color: ${({ theme }) => theme.text.faint};
  font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; margin-bottom: 4px;
`;

export const KPIValue = styled.div`
  font-size: 28px; font-weight: 800; letter-spacing: -1px;
  color: ${({ theme }) => theme.text.primary};
`;

export const KPIDelta = styled.div<{ variant?: "up" | "warn" | "neutral" }>`
  font-size: 11.5px; font-weight: 600; margin-top: 4px;
  color: ${({ variant }) =>
    variant === "up" ? "#16a34a" : variant === "warn" ? "#d97706" : "#9ca3af"};
`;

// ── Chart grid ─────────────────────────────────────────────────────────────

export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
  animation: ${fadeUp} 0.4s ease both;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

export const ChartCard = styled.div<{ delay?: number }>`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  padding: 20px;
  animation: ${fadeUp} 0.4s ${({ delay = 0 }) => delay}s ease both;
`;

export const ChartTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.text.primary};
`;

export const ChartSubtitle = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.text.faint};
  margin-left: auto;
  font-weight: 500;
`;

// ── Bar chart ──────────────────────────────────────────────────────────────

export const BarChartWrap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 140px;
  padding-top: 8px;
`;

export const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 4px;
`;

export const Bar = styled.div<{ heightPct: number; delay?: number; highlight?: boolean }>`
  border-radius: 6px 6px 2px 2px;
  width: 100%;
  height: ${({ heightPct }) => heightPct}%;
  min-height: 3px;
  background: ${({ heightPct }) =>
    heightPct > 0
      ? "linear-gradient(180deg, #1677ff, #38bdf8)"
      : "#e5e7eb"};
  animation: ${growBar} 0.6s ${({ delay = 0 }) => delay}s ease both;
  transition: opacity 0.15s;
  cursor: pointer;
  ${({ highlight }) => highlight ? "box-shadow: 0 0 12px #1677ff44;" : ""}
  &:hover { opacity: 0.8; }
`;

export const BarLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.text.faint};
  font-weight: 600;
`;

export const BarValue = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.primary};
`;

// ── Retention grid ─────────────────────────────────────────────────────────

export const RetentionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

export const RetentionCard = styled.div`
  text-align: center;
  background: ${({ theme }) => theme.bg.layout};
  border-radius: 10px;
  padding: 16px 12px;
`;

export const RetentionPct = styled.div<{ color: string }>`
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  color: ${({ color }) => color};
`;

export const RetentionLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
  font-weight: 600;
  margin-top: 4px;
`;

export const RetentionNote = styled.div`
  margin-top: 16px;
  text-align: center;
  font-size: 11.5px;
  color: ${({ theme }) => theme.text.faint};
`;

// ── Leaderboard ────────────────────────────────────────────────────────────

export const Leaderboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const LBRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
`;

export const LBRank = styled.div<{ variant?: "gold" | "silver" | "bronze" }>`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  ${({ variant }) => {
    const styles: Record<string, string> = {
      gold:   "background: #fef3c7; color: #d97706;",
      silver: "background: #f1f5f9; color: #64748b;",
      bronze: "background: #fff7ed; color: #ea580c;",
    };
    return styles[variant ?? ""] || "background: #f3f4f6; color: #9ca3af;";
  }}
`;

export const LBName = styled.div`
  font-size: 13px;
  font-weight: 600;
  flex: 1;
  color: ${({ theme }) => theme.text.primary};
`;

export const LBBarWrap = styled.div`
  width: 120px;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
`;

export const LBBarFill = styled.div<{ widthPct: number; color: string; delay?: number }>`
  height: 100%;
  border-radius: 3px;
  background: ${({ color }) => color};
  width: ${({ widthPct }) => widthPct}%;
  animation: ${growWidth} 0.8s ${({ delay = 0 }) => delay}s ease both;
`;

export const LBVal = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.primary};
  width: 60px;
  text-align: right;
`;

// ── Donut chart ────────────────────────────────────────────────────────────

export const DonutWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 0;
`;

export const DonutSvg = styled.svg`
  width: 130px;
  height: 130px;
  flex-shrink: 0;
`;

export const DonutRing = styled.circle`
  fill: none;
  stroke-width: 16;
  transition: stroke-dashoffset 0.8s ease;
`;

export const DonutLabel = styled.text`
  font-size: 22px;
  font-weight: 800;
  fill: ${({ theme }) => theme.text.primary};
`;

export const DonutSub = styled.text`
  font-size: 10px;
  fill: ${({ theme }) => theme.text.faint};
  font-weight: 600;
`;

export const DonutLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.text.primary};
`;

export const LegendDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ color }) => color};
  flex-shrink: 0;
`;

export const LegendVal = styled.span`
  font-weight: 700;
  margin-left: auto;
`;
