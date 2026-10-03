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
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 28%);
  gap: clamp(8px, 1vw, 16px);
  height: 100%;
  max-height: 100%;
  width: 100%;
  min-height: 0;
  min-width: 0;
  padding: clamp(8px, 1vw, 16px);
  overflow: hidden;
  background: ${p => p.theme.bg.layout};

  @media (max-width: 1020px) {
    grid-template-columns: minmax(0, 1fr) minmax(310px, 34%);
  }
`;

export const ScanProductPane = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  container: cart-pane / inline-size;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }

  @media (max-height: 820px) { gap: 9px; }
  @media (max-height: 740px) { gap: 7px; }
`;

export const CheckoutPane = styled.div`
  min-width: 0;
  min-height: 0;
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 14px;
  background: ${p => p.theme.bg.surface};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  container: checkout-pane / inline-size;
`;

// ─── Scan hero box ────────────────────────────────────────────────────────────

export const ScanHeroBox = styled.div`
  background: ${p => p.theme.bg.surface};
  border: 2px solid #2563eb;
  border-radius: 12px;
  padding: clamp(10px, 1vw, 14px) clamp(12px, 1.2vw, 16px) clamp(9px, 0.9vw, 12px);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06), 0 8px 20px rgba(37, 99, 235, 0.05);
  flex-shrink: 0;

  @media (max-height: 740px) { padding-block: 8px 7px; }
`;

export const ScanHeroLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  @media (max-height: 820px) { margin-bottom: 6px; }
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
  height: 48px;
  font-size: 14px;
  border-radius: 10px;
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

  @media (max-height: 820px) { height: 44px; }
  @media (max-height: 740px) { height: 42px; }
`;

export const ScanHeroHint = styled.div`
  font-size: 11.5px;
  color: #9ca3af;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;

  @media (max-height: 820px) { margin-top: 5px; }
  @media (max-height: 740px) { font-size: 11px; }
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
  background: ${p => p.theme.bg.surface};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.035);
`;

export const CartListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(9px, 1vw, 13px) clamp(12px, 1.2vw, 16px);
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

export const CartListTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${p => p.theme.text.secondary};
  letter-spacing: -0.1px;
`;

export const ClearAllBtn = styled.button`
  background: none;
  border: none;
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px 6px;

  &:hover { color: #dc2626; text-decoration: underline; }
`;

export const CartRows = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0 clamp(10px, 1.2vw, 16px) clamp(10px, 1vw, 14px);
  min-height: 0;
  overscroll-behavior: contain;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
`;

export const CartRowItem = styled.div<{ $hasImage: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasImage }) => $hasImage
    ? "28px 52px minmax(0, 1fr) auto minmax(86px, auto) 24px"
    : "28px minmax(0, 1fr) auto minmax(86px, auto) 24px"};
  grid-template-areas: ${({ $hasImage }) => $hasImage
    ? '"number image info quantity total delete" ". pricing pricing pricing pricing pricing"'
    : '"number info quantity total delete" ". pricing pricing pricing pricing"'};
  align-items: start;
  column-gap: clamp(7px, 0.8vw, 12px);
  row-gap: clamp(7px, 0.7vw, 10px);
  padding: clamp(10px, 1vw, 14px) 0;
  background: ${p => p.theme.bg.surface};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  transition: background 0.12s;

  &:last-child { border-bottom: none; }

  @container cart-pane (max-width: 720px) {
    grid-template-columns: ${({ $hasImage }) => $hasImage
      ? "28px 44px minmax(0, 1fr) auto 24px"
      : "28px minmax(0, 1fr) auto 24px"};
    grid-template-areas: ${({ $hasImage }) => $hasImage
      ? '"number image info quantity delete" ". image total total total" ". pricing pricing pricing pricing"'
      : '"number info quantity delete" ". total total total" ". pricing pricing pricing"'};
  }
`;

export const RowProductThumb = styled.div`
  grid-area: image;
  position: relative;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border: 1px solid ${p => p.theme.border.subtle};
  border-radius: 9px;
  background: ${p => p.theme.bg.subtle};

  img { object-fit: cover; }

  @container cart-pane (max-width: 720px) {
    width: 44px;
    height: 44px;
  }
`;

export const RowNumber = styled.span`
  grid-area: number;
  width: 28px;
  height: 28px;
  background: #eff4ff;
  color: #2563eb;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const RowInfoWrap = styled.div`
  grid-area: info;
  min-width: 0;
`;

export const RowProductName = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const RowMetaLine = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 5px;
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
  grid-area: quantity;
  display: flex;
  align-items: center;
  gap: 2px;
  align-self: center;
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
  grid-area: total;
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  min-width: 62px;
  text-align: right;
  white-space: nowrap;
  align-self: center;
`;

export const RowDelBtn = styled.button`
  grid-area: delete;
  background: none;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  line-height: 1;
  align-self: center;

  &:hover { color: #dc2626; }
`;

export const RowPricingBar = styled.div`
  grid-area: pricing;
  border-radius: 8px;
  background: ${p => p.theme.bg.subtle};
  padding: 7px 10px;

  > div {
    margin-top: 0;
    gap: 6px;
  }

  .ant-select { min-width: 120px; }
  .ant-input-number { width: 96px; }

  @container cart-pane (max-width: 560px) {
    padding: 6px 8px;

    > div { row-gap: 6px; }
    .ant-select { min-width: 108px; }
    .ant-input-number { width: 88px; }
  }
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
  padding: 13px 16px 11px;
  border-bottom: 1.5px solid ${p => p.theme.border.primary};
  flex-shrink: 0;

  @media (max-height: 820px) { padding-block: 9px 8px; }
  @media (max-height: 740px) { padding-block: 7px; }
`;

export const CheckoutHeaderTitle = styled.span`
  font-size: 16px;
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
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const CheckoutSection = styled.div`
  padding: clamp(8px, 1vw, 11px) clamp(10px, 1.1vw, 14px);
  border-bottom: 1px solid #f0f0f0;

  &:last-child { border-bottom: none; }

  @media (max-height: 820px) { padding-block: 8px; }
  @media (max-height: 740px) { padding-block: 7px; }
`;

export const CheckoutSectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;

  @media (max-height: 820px) { margin-bottom: 6px; }
`;

export const CustomerGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 8px;

  @container checkout-pane (max-width: 340px) {
    grid-template-columns: minmax(0, 1fr);

    > div { grid-column: 1; }
  }
`;

export const CustomerField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(3px, 0.45vw, 6px);
`;

export const APayPill = styled.button<{ $active: boolean }>`
  appearance: none;
  border: 1.5px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  border-radius: 9px;
  background: ${({ $active, theme }) => ($active ? "#eff4ff" : theme.bg.subtle)};
  color: ${({ $active }) => ($active ? "#2563eb" : "#6b7280")};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? "700" : "500")};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 4px clamp(4px, 0.5vw, 7px);
  gap: 4px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: #93c5fd; background: ${({ $active }) => ($active ? "#eff4ff" : "#f0f7ff")}; }
  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  @container checkout-pane (max-width: 350px) {
    min-height: 32px;
    padding-inline: 3px;
    gap: 3px;
    font-size: 11.5px;
  }
`;

export const PayPillEmoji = styled.span`
  font-size: 14px;
  line-height: 1;
`;

export const SplitPaymentsWrap = styled.div`
  margin-top: 10px;
  display: grid;
  gap: 8px;
`;

export const SplitPaymentRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(88px, 1fr) auto;
  gap: 8px;

  @container checkout-pane (max-width: 340px) {
    grid-template-columns: minmax(0, 1fr) minmax(88px, 1fr);

    > .ant-btn { grid-column: 1 / -1; }
  }
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
  min-width: 0;
`;

export const DiscountHeader = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
`;

export const AppliedOfferChip = styled.span`
  min-width: 0;
  max-width: 48%;
  margin-left: auto;
  padding: 2px 7px;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 10.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  background: transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-height: 820px) { gap: 5px; }
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

  @media (max-height: 820px) { padding-top: 7px; }
`;

export const CheckoutFooter = styled.div`
  padding: clamp(8px, 0.9vw, 11px) clamp(10px, 1.1vw, 14px);
  border-top: 1.5px solid ${p => p.theme.border.primary};
  flex-shrink: 0;
  background: ${p => p.theme.bg.surface};

  .ant-btn-lg {
    height: clamp(40px, 5.5dvh, 46px) !important;
  }

  @media (max-height: 740px) { padding-block: 7px 6px; }
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

  @media (max-height: 820px) { margin-top: 3px; }
`;

// ─── Camera scan button (shown in ScanHeroBox) ────────────────────────────────

export const ScanHeroInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CameraScanBtn = styled.button`
  flex-shrink: 0;
  height: 48px;
  padding: 0 16px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border: none;
  border-radius: 10px;
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

  @media (max-height: 820px) { height: 44px; }
  @media (max-height: 740px) { height: 42px; }
`;

export const CheckoutToolsRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;

  @container checkout-pane (max-width: 320px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const MoreOptionsButton = styled(Button)`
  height: 32px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
`;

export const MoreOptionsContent = styled.div`
  width: min(330px, calc(100vw - 40px));
  padding: 2px;
`;

export const DiscountsWrap = styled.div`
  .ant-collapse {
    border: 0;
    background: transparent;
  }

  .ant-collapse-header {
    padding: 0 !important;
    align-items: center !important;
    font-size: 12px;
    font-weight: 700;
    color: ${p => p.theme.text.primary} !important;
    min-width: 0;
  }

  .ant-collapse-content {
    border-top: 0;
    background: transparent;
  }

  .ant-collapse-content-box {
    padding: 10px 0 0 !important;
  }
`;
