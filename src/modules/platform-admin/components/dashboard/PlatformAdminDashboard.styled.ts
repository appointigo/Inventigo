import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

// ── Keyframes ──────────────────────────────────────────────────────────────

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const growBar = keyframes`
  from { height: 0; }
`;

export const growWidth = keyframes`
  from { width: 0 !important; }
`;

export const counterPop = keyframes`
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
`;

// ── Page header ────────────────────────────────────────────────────────────

export const PageHeader = styled.div`
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

// ── KPI grid ───────────────────────────────────────────────────────────────

export const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
`;

export const KPICard = styled.div<{ delay?: number }>`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  padding: 20px 20px 16px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  animation: ${fadeUp} 0.4s ${({ delay = 0 }) => delay}s ease both;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
`;

export const KPIGlow = styled.div<{ color: string }>`
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${({ color }) => color};
  opacity: 0.08;
  pointer-events: none;
`;

export const KPIIconWrap = styled.div<{ color: string }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${({ color }) => color}18;
  color: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 12px;
`;

export const KPILabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.text.muted};
  font-weight: 500;
  margin-bottom: 5px;
`;

export const KPIValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.text.primary};
  letter-spacing: -1px;
  line-height: 1;
`;

export const KPIDelta = styled.div<{ positive?: boolean; neutral?: boolean }>`
  font-size: 11.5px;
  font-weight: 600;
  margin-top: 8px;
  padding: 2px 7px;
  border-radius: 20px;
  display: inline-block;
  color: ${({ positive, neutral, theme }) =>
    neutral ? theme.text.faint : positive ? "#16a34a" : "#dc2626"};
  background: ${({ positive, neutral, theme }) =>
    neutral ? theme.bg.muted : positive ? "#f0fdf4" : "#fef2f2"};
`;

// ── Mid row (chart + activity) ─────────────────────────────────────────────

export const MidRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

// ── Generic panel ──────────────────────────────────────────────────────────

export const Panel = styled.div<{ delay?: number }>`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeUp} 0.4s ${({ delay = 0 }) => delay}s ease both;
`;

export const PanelHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PanelTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.primary};
  flex: 1;
`;

export const PanelAction = styled.span`
  font-size: 12px;
  color: #1677ff;
  cursor: pointer;
  font-weight: 600;
  background: none;
  border: none;
  padding: 0;
  &:hover { text-decoration: underline; }
`;

// ── Bar chart ──────────────────────────────────────────────────────────────

export const ChartArea = styled.div`
  padding: 20px 18px 14px;
`;

export const ChartBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 120px;
  padding-bottom: 24px;
  position: relative;
`;

export const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
`;

export const Bar = styled.div<{ heightPct: number; delay?: number }>`
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(to top, #1677ff, #38bdf8);
  height: ${({ heightPct }) => heightPct}%;
  min-height: 4px;
  animation: ${growBar} 0.6s ${({ delay = 0 }) => delay}s ease both;
  transition: opacity 0.15s;
  cursor: pointer;
  &:hover { opacity: 0.8; }
`;

export const BarLabel = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.text.faint};
  white-space: nowrap;
`;

export const ChartLegend = styled.div`
  display: flex;
  gap: 14px;
  padding: 8px 0 0;
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.text.muted};
`;

export const LegendDot = styled.div<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ color }) => color};
`;

// ── Activity feed ──────────────────────────────────────────────────────────

export const ActivityList = styled.div`
  padding: 6px 0;
`;

export const ActivityItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 20px;
  transition: background 0.15s;
  cursor: default;
  &:hover { background: ${({ theme }) => theme.bg.subtle}; }
`;

export const ActivityDot = styled.div<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ color }) => color};
  margin-top: 5px;
  flex-shrink: 0;
`;

export const ActivityText = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.primary};
  line-height: 1.4;
`;

export const ActivityTime = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
  margin-top: 2px;
`;

// ── Plan distribution ──────────────────────────────────────────────────────

export const PlanDistGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding: 16px 20px;
`;

export const PlanDistItem = styled.div`
  background: ${({ theme }) => theme.bg.layout};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 10px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
`;

export const PlanDistName = styled.div<{ planColor?: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ planColor, theme }) => planColor || theme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const PlanDistCount = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.text.primary};
  letter-spacing: -0.5px;
  margin: 4px 0;
`;

export const PlanDistPct = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
  margin-bottom: 8px;
`;

export const PlanBarTrack = styled.div`
  height: 5px;
  border-radius: 3px;
  background: ${({ theme }) => theme.bg.muted};
  overflow: hidden;
`;

export const PlanBarFill = styled.div<{ widthPct: number; color: string; delay?: number }>`
  height: 100%;
  border-radius: 3px;
  background: ${({ color }) => color};
  width: ${({ widthPct }) => widthPct}%;
  animation: ${growWidth} 0.8s ${({ delay = 0 }) => delay}s ease both;
`;

// ── Recent orgs table ──────────────────────────────────────────────────────

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
`;
