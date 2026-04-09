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

export const ResultCount = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.faint};
  margin-left: auto;
`;

// ── Timeline panel ─────────────────────────────────────────────────────────

export const TimelinePanel = styled.div`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeUp} 0.4s 0.1s ease both;
`;

export const Timeline = styled.div`
  display: flex;
  flex-direction: column;
`;

export const TLItem = styled.div`
  display: flex;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.12s;
  &:hover { background: #f8faff; }
  &:last-child { border-bottom: none; }
`;

export const TLDotCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  padding-top: 3px;
`;

export const TLDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ color }) => color};
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px ${({ color }) => color};
`;

export const TLLine = styled.div`
  flex: 1;
  width: 2px;
  background: #e5e7eb;
  margin-top: 4px;
  border-radius: 1px;
`;

export const TLBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const TLAction = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
`;

export const TLTarget = styled.span`
  color: #1677ff;
  font-weight: 700;
`;

export const TLMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 3px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.text.faint};
  flex-wrap: wrap;
`;

export const TLBy = styled.span`
  color: ${({ theme }) => theme.text.muted};
  font-weight: 500;
`;

export const TLDetail = styled.div`
  margin-top: 6px;
  background: ${({ theme }) => theme.bg.layout};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.text.muted};
`;

export const TLCode = styled.code`
  background: #e5e7eb;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11.5px;
  font-family: 'SF Mono', Consolas, monospace;
`;

// ── Badge ──────────────────────────────────────────────────────────────────

export const Badge = styled.span<{ variant: "green" | "red" | "blue" | "purple" | "orange" | "gray" }>`
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 20px;
  ${({ variant }) => {
    const s: Record<string, string> = {
      green:  "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;",
      red:    "background:#fef2f2;color:#dc2626;border:1px solid #fecaca;",
      blue:   "background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;",
      purple: "background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;",
      orange: "background:#fffbeb;color:#d97706;border:1px solid #fde68a;",
      gray:   "background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;",
    };
    return s[variant] || s.gray;
  }}
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

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.text.faint};
  font-size: 13px;
`;
