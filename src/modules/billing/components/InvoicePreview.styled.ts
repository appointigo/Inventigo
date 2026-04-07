import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button } from "antd";

// ─── Keyframes ────────────────────────────────────────────────────────────────

export const popIn = keyframes`
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Header (gradient) ────────────────────────────────────────────────────────

export const InvoiceHeader = styled.div`
  background: linear-gradient(135deg, #1d4ed8 0%, #4f46e5 50%, #7c3aed 100%);
  padding: 28px 52px 22px 28px;
  position: relative;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
  margin: -20px -24px 0;

  &::before {
    content: "";
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    top: -60px;
    right: -40px;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    bottom: -30px;
    left: 30px;
    pointer-events: none;
  }
`;

export const SuccessRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
`;

export const SuccessIconCircle = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: ${popIn} 0.5s cubic-bezier(0.22, 0.68, 0, 1.6) 0.2s both;
  color: white;
  .anticon { font-size: 24px; }
`;

export const SuccessTextWrap = styled.div`
  flex: 1;
`;

export const SuccessTitle = styled.div`
  font-size: 19px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.3px;
`;

export const SuccessSubtext = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 3px;
`;

export const InvoiceNumBadge = styled.div`
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
`;

export const MetaPills = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
`;

export const MetaPill = styled.div<{ $green?: boolean }>`
  background: ${({ $green }) =>
    $green ? "rgba(22,163,74,0.2)" : "rgba(255,255,255,0.12)"};
  border: 1px solid ${({ $green }) =>
    $green ? "rgba(22,163,74,0.4)" : "rgba(255,255,255,0.2)"};
  border-radius: 8px;
  padding: 5px 11px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const PillLabel = styled.span`
  opacity: 0.65;
  font-size: 10.5px;
`;

// ─── Body sections ────────────────────────────────────────────────────────────

export const InvoiceBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 20px;
`;

export const PartiesRow = styled.div`
  display: flex;
  gap: 24px;
`;

export const Party = styled.div<{ $right?: boolean }>`
  flex: 1;
  text-align: ${({ $right }) => ($right ? "right" : "left")};
`;

export const PartyLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 6px;
`;

export const PartyName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #111827;
`;

export const PartyDetail = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-top: 3px;
  line-height: 1.6;
`;

export const SectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 10px;
`;

// ─── Items Table ──────────────────────────────────────────────────────────────

export const TableWrap = styled.div`
  .ant-table-thead > tr > th {
    background: #f8f9fc;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #6b7280;
    border-bottom: 1.5px solid #e8eaed;
  }

  .ant-table-tbody > tr > td {
    padding: 11px 12px;
    vertical-align: middle;
  }

  .ant-table-tbody > tr {
    transition: background 0.15s;
  }

  .ant-table-tbody > tr:hover > td {
    background: #f8f9fc !important;
  }

  .ant-table {
    border: 1px solid #e8eaed;
    border-radius: 12px;
    overflow: hidden;
  }
`;

export const ItemNameCell = styled.span`
  font-weight: 600;
  font-size: 13px;
  color: #111827;
  display: block;
`;

export const ItemSkuCell = styled.span`
  font-size: 11.5px;
  color: #9ca3af;
  margin-top: 3px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`;

export const SizeBadge = styled.span`
  display: inline-block;
  background: #eff4ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
`;

export const AttrBadge = styled.span`
  display: inline-block;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 6px;
`;

// ─── Summary Card ─────────────────────────────────────────────────────────────

export const SummaryCard = styled.div`
  background: #f8f9fc;
  border: 1.5px solid #e8eaed;
  border-radius: 12px;
  overflow: hidden;
`;

export const SumRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
`;

export const TotalSumRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 16px;
  font-size: 16px;
  font-weight: 700;
  background: #eff4ff;
  border-top: 1.5px solid #bfdbfe;
  color: #2563eb;
`;

// ─── New Sale Banner ──────────────────────────────────────────────────────────

export const NewSaleBanner = styled.div`
  background: #f0fdf4;
  border: 1.5px solid #86efac;
  border-radius: 10px;
  padding: 11px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: ${slideUp} 0.4s ease 0.3s both;
  margin-top: 4px;
`;

export const NewSaleBannerText = styled.span`
  flex: 1;
  font-size: 13px;
  color: #16a34a;
  font-weight: 500;
`;

export const NewSaleBtn = styled.button`
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;

  &:hover {
    background: #15803d;
  }
`;

// ─── Footer Actions ───────────────────────────────────────────────────────────

export const FooterActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

export const ActionButton = styled(Button)`
  flex: 1;
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

export const PrintButton = styled(Button)`
  flex: 1;
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease !important;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4) !important;
  }
`;

export const InvoiceBodyContent = styled.div`
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const DiscountText = styled.span`
  color: #16a34a;
`;
