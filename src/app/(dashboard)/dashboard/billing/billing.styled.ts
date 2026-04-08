import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, Badge, Input, InputNumber, Tag, Select, Tabs } from "antd";

// ─── Keyframes ────────────────────────────────────────────────────────────────

export const fadeRow = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const addPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.18); }
`;

// ─── Page Shell ───────────────────────────────────────────────────────────────

export const PageWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

// ─── Split Layout ─────────────────────────────────────────────────────────────

export const SplitLayout = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
`;

export const ProductPane = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const CartPane = styled.div`
  width: 420px;
  flex-shrink: 0;
  border-left: 1.5px solid ${p => p.theme.border.primary};
  background: ${p => p.theme.bg.surface};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// ─── Cart Button ──────────────────────────────────────────────────────────────

export const CartBadge = styled(Badge)`
  .ant-badge-count {
    box-shadow: none;
    font-weight: 700;
  }
`;

export const CartButton = styled(Button)`
  height: 40px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.38) !important;
  }
`;

// ─── Search ───────────────────────────────────────────────────────────────────

export const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 12px;
`;

export const SearchInput = styled(Input)`
  border-radius: 10px;
  height: 44px;
  font-size: 14px;
  border: 1.5px solid ${p => p.theme.border.primary};
  background: ${p => p.theme.bg.surface};
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: #93c5fd;
  }

  &:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .ant-input-prefix {
    color: #9ca3af;
  }
`;

// ─── Product Table Cells ──────────────────────────────────────────────────────

export const ProductNameText = styled.span`
  font-weight: 600;
  font-size: 13.5px;
  color: ${p => p.theme.text.primary};
  display: block;
`;

export const ProductMetaText = styled.span`
  font-size: 11.5px;
  color: ${p => p.theme.text.faint};
  margin-top: 2px;
  display: block;
`;

export const StockBadgeWrap = styled.span<{ $level: "high" | "mid" | "low" }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;

  ${({ $level }) =>
    $level === "high" &&
    `background: #f0fdf4; color: #16a34a;`}
  ${({ $level }) =>
    $level === "mid" &&
    `background: #fff7ed; color: #ea580c;`}
  ${({ $level }) =>
    $level === "low" &&
    `background: #fef2f2; color: #dc2626;`}

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;

export const AttrText = styled.span`
  font-size: 12.5px;
  color: #6b7280;
`;

export const EmptyAttrText = styled.span`
  font-size: 12px;
  color: #d1d5db;
`;

export const VariantSkuText = styled.span`
  font-family: "SF Mono", "Fira Code", ui-monospace, monospace;
  font-size: 11.5px;
  color: #374151;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  padding: 2px 6px;
  letter-spacing: 0.3px;
`;

export const VariantSkuEmpty = styled.span`
  font-size: 11.5px;
  color: #d1d5db;
`;

// ─── Qty Input ────────────────────────────────────────────────────────────────

export const QtyInput = styled(InputNumber, {
  shouldForwardProp: (prop) => prop !== "$active",
})<{ $active?: boolean }>`
  width: 64px;
  border-radius: 8px;
  border: 1.5px solid ${({ $active }) => ($active ? "#2563eb" : "#e8eaed")};
  background: ${({ $active }) => ($active ? "#eff4ff" : "#fff")};
  text-align: center;
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  color: ${({ $active }) => ($active ? "#2563eb" : "#111827")};
  transition: border-color 0.2s, background 0.2s;

  .ant-input-number-input {
    text-align: center;
    font-weight: inherit;
  }

  &:hover {
    border-color: #93c5fd;
  }

  &:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
`;

// ─── Add Button ───────────────────────────────────────────────────────────────

export const AddButton = styled(Button)`
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
  transition: all 0.18s ease;

  &:not(:disabled):hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4) !important;
    background: #1d4ed8 !important;
  }

  &:not(:disabled):active {
    transform: scale(0.93);
    animation: ${addPulse} 0.3s ease;
  }
`;

// ─── Table Row Animation ──────────────────────────────────────────────────────

export const TableWrapper = styled.div`
  .ant-table-tbody > tr {
    animation: ${fadeRow} 0.25s ease both;
    transition: background 0.15s;
  }

  .ant-table-tbody > tr:hover > td {
    background: #eff4ff !important;
  }

  .ant-table-thead > tr > th {
    background: #f8f9fc;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
    border-bottom: 1.5px solid #e8eaed;
  }

  .ant-table-tbody > tr > td {
    vertical-align: middle;
    padding: 11px 12px;
  }

  .ant-table {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e8eaed;
  }
`;

// ─── Misc ──────────────────────────────────────────────────────────────────

export const PageTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  letter-spacing: -0.3px;
`;

export const SizeTag = styled(Tag)`
  margin: 0 !important;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
`;

export const SizeSelect = styled(Select)`
  .ant-select-selector {
    border-radius: 8px !important;
    font-size: 12.5px !important;
  }
`;

// ─── Top-level billing page tabs (fills full available height) ────────────────

export const BillingPageTabs = styled(Tabs)`
  height: 100%;
  display: flex;
  flex-direction: column;

  .ant-tabs-nav {
    margin: 0;
    padding: 0 24px;
    flex-shrink: 0;
    /* Let Ant Design token control the background — do NOT hardcode #ffffff
       (dark algorithm sets tab text to white; white text on white bg = invisible) */
    border-bottom: 1.5px solid var(--border-primary);
  }

  /* Remove the default bottom border of the tab bar — we use our own */
  .ant-tabs-nav::before {
    border-bottom: none !important;
  }

  .ant-tabs-content-holder {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ant-tabs-content {
    height: 100%;
  }

  .ant-tabs-tabpane {
    height: 100%;
    overflow: hidden;
  }
`;

// Wrapper for the Sales History tab pane content
export const HistoryPane = styled.div`
  height: 100%;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;
