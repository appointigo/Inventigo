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

// ── Toolbar ────────────────────────────────────────────────────────────────

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  margin-bottom: 14px;
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

// ── Flags grid ─────────────────────────────────────────────────────────────

export const FlagsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  animation: ${fadeUp} 0.4s ease both;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

export const FlagCard = styled.div`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  padding: 18px 20px;
  transition: box-shadow 0.2s, transform 0.2s;
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
`;

export const FlagHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

export const FlagHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const FlagKey = styled.div`
  font-size: 13px;
  font-weight: 700;
  font-family: 'SF Mono', Consolas, monospace;
  color: ${({ theme }) => theme.text.primary};
`;

export const FlagDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.text.muted};
  margin-bottom: 14px;
  line-height: 1.5;
`;

export const FlagMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
`;

// ── Toggle switch ──────────────────────────────────────────────────────────

export const Toggle = styled.div<{ on: boolean }>`
  width: 38px;
  height: 20px;
  border-radius: 10px;
  background: ${({ on }) => on ? "#1677ff" : "#e5e7eb"};
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ on }) => on ? "20px" : "2px"};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
`;

// ── Scope badge ────────────────────────────────────────────────────────────

export const ScopeBadge = styled.span<{ scope: "GLOBAL" | "PER_ORG" }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 4px;
  ${({ scope }) =>
    scope === "GLOBAL"
      ? "background: #eff6ff; color: #1d4ed8;"
      : "background: #f5f3ff; color: #7c3aed;"}
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.text.faint};
  font-size: 13px;
  grid-column: 1 / -1;
`;
