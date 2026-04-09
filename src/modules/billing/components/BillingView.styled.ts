import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, Input, InputNumber } from "antd";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.3; transform: scale(1.35); }
`;

// ─── Root layout ──────────────────────────────────────────────────────────────

export const ViewAWrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
  background: ${p => p.theme.bg.layout};
`;

export const ScanProductPane = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 20px 16px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const CheckoutPane = styled.div`
  width: 380px;
  flex-shrink: 0;
  border-left: 1.5px solid ${p => p.theme.border.primary};
  background: ${p => p.theme.bg.surface};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// ─── Scan hero box ────────────────────────────────────────────────────────────

export const ScanHeroBox = styled.div`
  background: ${p => p.theme.bg.surface};
  border: 2px solid #2563eb;
  border-radius: 16px;
  padding: 20px 22px 16px;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.07);
  flex-shrink: 0;
`;

export const ScanHeroLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

export const ScanBlinker = styled.span`
  width: 7px;
  height: 7px;
  background: #2563eb;
  border-radius: 50%;
  display: inline-block;
  animation: ${blink} 1.5s ease-in-out infinite;
`;

export const ScanHeroLabelText = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.7px;
`;

export const ScanHeroInput = styled(Input)`
  height: 52px;
  font-size: 16px;
  border-radius: 12px;
  border: 1.5px solid ${p => p.theme.border.primary};
  background: ${p => p.theme.bg.subtle};

  &:hover { border-color: #93c5fd; }

  &.ant-input-affix-wrapper:focus,
  &.ant-input-affix-wrapper-focused {
    border-color: #2563eb;
    background: ${p => p.theme.bg.surface};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .ant-input-prefix { color: #9ca3af; margin-right: 8px; }
`;

export const ScanHeroHint = styled.div`
  font-size: 11.5px;
  color: #9ca3af;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`;

export const KbdKey = styled.kbd`
  background: ${p => p.theme.bg.muted};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: monospace;
  color: ${p => p.theme.text.muted};
`;

// ─── Scan flash (green ribbon shown for ~2.5s after successful scan) ──────────

export const ScanFlash = styled.div`
  background: ${p => p.theme.isDark ? "rgba(22, 163, 74, 0.15)" : "#f0fdf4"};
  border: 1.5px solid ${p => p.theme.isDark ? "rgba(22, 163, 74, 0.4)" : "#bbf7d0"};
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  animation: ${slideDown} 0.22s ease both;
  flex-shrink: 0;
`;

export const ScanFlashInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ScanFlashName = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ScanFlashMeta = styled.div`
  font-size: 11.5px;
  color: ${p => p.theme.text.muted};
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const ScanFlashSku = styled.span`
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 10.5px;
  background: ${p => p.theme.bg.muted};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 4px;
  padding: 1px 5px;
  color: ${p => p.theme.text.secondary};
`;

export const ScanFlashSize = styled.span`
  background: #eff4ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 5px;
`;

export const ScanFlashPrice = styled.div`
  font-size: 17px;
  font-weight: 800;
  color: ${p => p.theme.text.primary};
  white-space: nowrap;
`;

export const ScanAddedBadge = styled.div`
  background: #16a34a;
  color: #fff;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
`;

// ─── Search results panel ─────────────────────────────────────────────────────

export const ResultsBox = styled.div`
  background: ${p => p.theme.bg.surface};
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  animation: ${slideDown} 0.18s ease both;
`;

export const ResultsBoxHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  background: ${p => p.theme.bg.subtle};
`;

export const ResultsBoxTitle = styled.span`
  font-size: 11.5px;
  color: ${p => p.theme.text.muted};
  font-weight: 500;
`;

export const ResultsCountBadge = styled.span`
  font-size: 11px;
  color: ${p => p.theme.text.faint};
  background: ${p => p.theme.bg.muted};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 5px;
  padding: 2px 7px;
`;

export const ResultsScrollBody = styled.div`
  max-height: 210px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const ResultRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  transition: background 0.12s;

  &:last-child { border-bottom: none; }
  &:hover { background: ${p => p.theme.bg.subtle}; }
`;

export const ResultProductCol = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ResultProductName = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ResultProductBrand = styled.div`
  font-size: 11px;
  color: ${p => p.theme.text.faint};
  margin-top: 1px;
`;

export const ResultSkuPill = styled.span`
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 10.5px;
  background: ${p => p.theme.bg.muted};
  color: ${p => p.theme.text.secondary};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 5px;
  padding: 2px 6px;
  white-space: nowrap;
`;

export const ResultSizeBadge = styled.span`
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  white-space: nowrap;
`;

export const ResultStockText = styled.span<{ $out: boolean; $low: boolean }>`
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $out, $low }) => ($out ? "#dc2626" : $low ? "#f59e0b" : "#16a34a")};
`;

export const ResultPriceText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  white-space: nowrap;
`;

// ─── Cart row list ────────────────────────────────────────────────────────────

export const CartSectionWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

export const CartListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
`;

export const CartListTitle = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${p => p.theme.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const ClearAllBtn = styled.button`
  background: none;
  border: none;
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;

  &:hover { color: #dc2626; text-decoration: underline; }
`;

export const CartRows = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
`;

export const CartRowItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: ${p => p.theme.bg.surface};
  border: 1px solid ${p => p.theme.border.subtle};
  border-radius: 8px;
  transition: background 0.12s;

  &:hover { background: ${p => p.theme.bg.subtle}; }
`;

export const RowNumber = styled.span`
  width: 20px;
  height: 20px;
  background: #eff4ff;
  color: #2563eb;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const RowInfoWrap = styled.div`
  flex: 1;
  min-width: 0;
`;

export const RowProductName = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const RowMetaLine = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`;

export const RowSkuPill = styled.span`
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 10px;
  color: #6b7280;
`;

export const RowSizePill = styled.span`
  background: #eff4ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 0 5px;
`;

export const RowAttrPill = styled.span`
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 10px;
  padding: 0 4px;
`;

export const RowQtyCtrl = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

export const RowQtyBtn = styled.button`
  width: 22px;
  height: 22px;
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 5px;
  background: ${p => p.theme.bg.subtle};
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: ${p => p.theme.text.secondary};
  line-height: 1;

  &:hover { background: #eff4ff; border-color: #93c5fd; color: #2563eb; }
`;

export const RowQtyVal = styled.span`
  width: 26px;
  text-align: center;
  font-size: 12.5px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
`;

export const RowTotal = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  min-width: 62px;
  text-align: right;
  white-space: nowrap;
`;

export const RowDelBtn = styled.button`
  background: none;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  line-height: 1;

  &:hover { color: #dc2626; }
`;

export const CartEmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 24px;
`;

export const CartEmptyIcon = styled.div`
  font-size: 48px;
  opacity: 0.14;
`;

export const CartEmptyText = styled.div`
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
`;

// ─── Checkout right pane ──────────────────────────────────────────────────────

export const CheckoutHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px 12px;
  border-bottom: 1.5px solid ${p => p.theme.border.primary};
  flex-shrink: 0;
`;

export const CheckoutHeaderTitle = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
`;

export const CheckoutItemCount = styled.span`
  background: #eff4ff;
  color: #2563eb;
  border: 1.5px solid #bfdbfe;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  margin-left: auto;
`;

export const CheckoutScrollBody = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const CheckoutSection = styled.div`
  padding: 14px 18px 12px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child { border-bottom: none; }
`;

export const CheckoutSectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const CustomerGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const CustomerField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

export const CustomerFieldFull = styled(CustomerField)`
  grid-column: 1 / -1;
`;

export const FieldLabel = styled.span`
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
`;

export const RequiredStar = styled.span`
  color: #dc2626;
`;

export const CustWarning = styled.div`
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 7px;
  padding: 6px 10px;
  margin-top: 8px;
  font-size: 11.5px;
  color: #c2410c;
  display: flex;
  gap: 6px;
`;

export const PayPillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`;

export const APayPill = styled.div<{ $active: boolean }>`
  border: 1.5px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  border-radius: 9px;
  background: ${({ $active, theme }) => ($active ? "#eff4ff" : theme.bg.subtle)};
  color: ${({ $active }) => ($active ? "#2563eb" : "#6b7280")};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? "700" : "500")};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  gap: 2px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: #93c5fd; background: ${({ $active }) => ($active ? "#eff4ff" : "#f0f7ff")}; }
`;

export const PayPillEmoji = styled.span`
  font-size: 17px;
`;

export const APromoRow = styled.div`
  display: flex;
  gap: 6px;
`;

export const APromoInput = styled(Input)`
  border-radius: 8px;
  font-size: 12.5px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

export const APromoApplyBtn = styled(Button)`
  border-radius: 8px;
  font-weight: 600;
`;

export const APromoSuccessPill = styled.div`
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const APromoClearBtn = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  margin-left: auto;
  padding: 0;
  line-height: 1;

  &:hover { color: #dc2626; }
`;

export const SummaryCardWrap = styled.div`
  background: ${p => p.theme.bg.subtle};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ASumRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: ${p => p.theme.text.muted};
`;

export const ASumPctGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const ASumPctInput = styled(InputNumber)`
  width: 80px;
  border-radius: 6px;
  border: 1.5px solid ${p => p.theme.border.primary};

  .ant-input-number-input {
    text-align: right;
    font-size: 13px;
    color: ${p => p.theme.text.primary};
    padding-right: 6px;
  }

  .ant-input-number-handler-wrap {
    display: none;
  }
`;

export const ATotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 800;
  color: ${p => p.theme.text.primary};
  padding-top: 10px;
  border-top: 1.5px solid ${p => p.theme.border.primary};
  margin-top: 2px;
`;

export const CheckoutFooter = styled.div`
  padding: 14px 18px;
  border-top: 1.5px solid ${p => p.theme.border.primary};
  flex-shrink: 0;
  background: ${p => p.theme.bg.surface};
`;

export const ConfirmHint = styled.div`
  font-size: 11px;
  color: #f87171;
  text-align: center;
  margin-top: 6px;
`;

export const SecureText = styled.div`
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  margin-top: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

// ─── Camera scan button (shown in ScanHeroBox) ────────────────────────────────

export const ScanHeroInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CameraScanBtn = styled.button`
  flex-shrink: 0;
  height: 52px;
  padding: 0 16px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.1s;

  &:hover  { opacity: 0.92; }
  &:active { transform: scale(0.97); }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #9ca3af;
  }
`;
