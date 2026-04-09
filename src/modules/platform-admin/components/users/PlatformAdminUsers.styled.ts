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

export const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
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
  position: absolute;
  top: 0;
  right: 0;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: ${({ color }) => color};
  opacity: 0.06;
  transform: translate(30px, -30px);
  pointer-events: none;
`;

export const KPIIcon = styled.div<{ bg: string; color: string }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${({ bg }) => bg};
  color: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 12px;
`;

export const KPILabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.text.faint};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

export const KPIValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  color: ${({ theme }) => theme.text.primary};
`;

export const KPIDelta = styled.div<{ variant?: "up" | "warn" | "neutral" }>`
  font-size: 11.5px;
  font-weight: 600;
  margin-top: 4px;
  color: ${({ variant }) =>
    variant === "up" ? "#16a34a" :
    variant === "warn" ? "#d97706" :
    "#9ca3af"};
`;

// ── Toolbar ────────────────────────────────────────────────────────────────

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.35s ease both;
`;

export const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.bg.layout};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  padding: 7px 13px;
  flex: 1;
  max-width: 300px;
`;

export const SearchInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: ${({ theme }) => theme.text.primary};
  width: 100%;
  &::placeholder { color: ${({ theme }) => theme.text.faint}; }
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

export const ResultCount = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.faint};
  margin-left: auto;
`;

// ── Table panel ────────────────────────────────────────────────────────────

export const TablePanel = styled.div`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeUp} 0.4s 0.1s ease both;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const THead = styled.thead`
  tr { border-bottom: 1px solid ${({ theme }) => theme.border.primary}; }
  th {
    padding: 10px 20px;
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.text.faint};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    background: #f8fafc;
    text-align: left;
    white-space: nowrap;
  }
`;

export const TBody = styled.tbody`
  tr {
    border-bottom: 1px solid #f3f4f6;
    transition: background 0.12s;
    &:hover { background: #f8faff; }
    &:last-child { border-bottom: none; }
  }
  td {
    padding: 12px 20px;
    font-size: 13px;
    vertical-align: middle;
  }
`;

// ── User cell ──────────────────────────────────────────────────────────────

export const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const UserAvatar = styled.div<{ bg: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ bg }) => bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

export const UserName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
`;

export const UserEmail = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
`;

// ── Badges ─────────────────────────────────────────────────────────────────

export const Badge = styled.span<{ variant: "green" | "red" | "blue" | "purple" | "orange" | "gray" }>`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  ${({ variant }) => {
    const styles: Record<string, string> = {
      green:  "background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;",
      red:    "background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;",
      blue:   "background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;",
      purple: "background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;",
      orange: "background: #fffbeb; color: #d97706; border: 1px solid #fde68a;",
      gray:   "background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;",
    };
    return styles[variant] || styles.gray;
  }}
`;

// ── Action buttons ─────────────────────────────────────────────────────────

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
  margin-right: 4px;
  &:hover {
    border-color: ${({ danger }) => danger ? "#dc2626" : "#1677ff"};
    color: ${({ danger }) => danger ? "#dc2626" : "#1677ff"};
    ${({ danger }) => danger ? "background: #fef2f2;" : ""}
  }
`;

export const MoreBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border.primary};
  background: ${({ theme }) => theme.bg.surface};
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.text.faint};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &:hover { border-color: #1677ff; color: #1677ff; }
`;

// ── Pagination ─────────────────────────────────────────────────────────────

export const Pagination = styled.div`
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid ${({ theme }) => theme.border.primary};
  font-size: 12px;
  color: ${({ theme }) => theme.text.faint};
`;

export const PageBtns = styled.div`
  display: flex;
  gap: 4px;
`;

export const PageBtn = styled.button<{ active?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme, active }) => active ? "#1677ff" : theme.border.primary};
  background: ${({ active }) => active ? "#1677ff" : "transparent"};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: ${({ active, theme }) => active ? "#fff" : theme.text.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &:hover {
    border-color: #1677ff;
    color: ${({ active }) => active ? "#fff" : "#1677ff"};
  }
`;

export const FaintText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.text.faint};
`;

export const OrgNameText = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.text.primary};
`;
