import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Page header ────────────────────────────────────────────────────────────

export const PageTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
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

// ── Toolbar ────────────────────────────────────────────────────────────────

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.35s 0.05s ease both;
`;

export const ResultCount = styled.div`
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
  animation: ${fadeUp} 0.35s 0.1s ease both;

  .ant-table-thead > tr > th {
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.text.faint};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    background: #f8fafc;
    border-bottom: 1px solid ${({ theme }) => theme.border.primary};
  }

  .ant-table-tbody > tr {
    transition: background 0.12s;
  }

  .ant-table-tbody > tr:hover > td {
    background: #f8faff;
  }

  .ant-tag {
    border-radius: 20px;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.6;
  }

  .ant-pagination {
    padding: 14px 20px;
  }
`;

// ── Org cell ───────────────────────────────────────────────────────────────

export const OrgCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const OrgAvatar = styled.div<{ bg: string }>`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: ${({ bg }) => bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

// ── Detail drawer ──────────────────────────────────────────────────────────

export const DrawerBody = styled.div`
  padding: 0;
`;

export const DrawerOrgHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
`;

export const DrawerOrgAvatar = styled.div<{ bg: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ bg }) => bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

export const DrawerOrgName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.primary};
`;

export const DrawerOrgSlug = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.text.faint};
  margin-top: 2px;
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 16px 24px;
`;

export const StatCell = styled.div`
  background: ${({ theme }) => theme.bg.subtle};
  border: 1px solid ${({ theme }) => theme.border.subtle};
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
`;

export const StatValue = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }) => theme.text.primary};
  letter-spacing: -0.5px;
`;

export const StatLabel = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.text.faint};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`;

export const DrawerSection = styled.div`
  padding: 14px 24px 6px;
`;

export const DrawerSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.text.faint};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 10px;
`;

export const DrawerActions = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.border.primary};
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
`;

// ── Badge colours ──────────────────────────────────────────────────────────

export const OrgNameText = styled.div`
  font-weight: 600;
  font-size: 13.5px;
  color: ${({ theme }) => theme.text.primary};
`;

export const OrgSlugText = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
`;
