import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, Input, InputNumber } from "antd";

// ─── Keyframes ────────────────────────────────────────────────────────────────

export const slideItem = keyframes`
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ─── Panel Shell ──────────────────────────────────────────────────────────────

export const PanelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${p => p.theme.bg.surface};
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 14px;
  border-bottom: 1.5px solid ${p => p.theme.border.primary};
  flex-shrink: 0;
  background: ${p => p.theme.bg.surface};
`;

export const PanelTitleIcon = styled.span`
  font-size: 16px;
  color: #2563eb;
  display: flex;
  align-items: center;
`;

export const PanelTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  letter-spacing: -0.2px;
`;

export const PanelItemBadge = styled.span`
  background: #eff4ff;
  color: #2563eb;
  border: 1.5px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 9px;
  margin-left: auto;
`;

// ─── Items Area (max 3 items, then scrolls) ───────────────────────────────────

export const ItemsArea = styled.div`
  max-height: 330px;
  overflow-y: auto;
  padding: 12px 16px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const CartItemCard = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: ${p => p.theme.bg.subtle};
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 10px;
  padding: 10px 12px;
  animation: ${slideItem} 0.22s ease both;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: #bfdbfe;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06);
  }
`;

export const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ItemNameText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ItemMetaText = styled.span`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`;

export const SizeChip = styled.span`
  display: inline-block;
  background: #eff4ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 5px;
`;

export const AttrChip = styled.span`
  display: inline-block;
  background: ${p => p.theme.bg.muted};
  color: ${p => p.theme.text.secondary};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 500;
  padding: 1px 5px;
`;

export const ItemPriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

export const UnitPriceText = styled.span`
  font-size: 11.5px;
  color: ${p => p.theme.text.muted};
`;

export const LineTotalText = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  margin-left: auto;
`;

// ─── Quantity Controller ──────────────────────────────────────────────────────

export const QtyController = styled.div`
  display: flex;
  align-items: center;
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 7px;
  overflow: hidden;
  background: ${p => p.theme.bg.surface};
`;

export const QtyControlBtn = styled.button`
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  font-size: 15px;
  cursor: pointer;
  color: ${p => p.theme.text.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #eff4ff;
    color: #2563eb;
  }
`;

export const QtyDisplay = styled.span`
  min-width: 28px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  border-left: 1px solid ${p => p.theme.border.primary};
  border-right: 1px solid ${p => p.theme.border.primary};
  line-height: 26px;
`;

export const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  flex-shrink: 0;

  &:hover {
    color: #dc2626;
    background: #fef2f2;
  }
`;

// ─── Empty State ──────────────────────────────────────────────────────────────

export const EmptyCartPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
`;

export const EmptyCartIcon = styled.div`
  opacity: 0.25;
  font-size: 52px;
`;

export const EmptyCartText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
`;

export const EmptyCartHint = styled.span`
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  max-width: 200px;
  line-height: 1.6;
`;

// ─── Scrollable Sections Body ─────────────────────────────────────────────────

export const PanelScrollBody = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.primary}; border-radius: 2px; }
`;

export const PanelSection = styled.div`
  padding: 12px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: ${p => p.theme.text.faint};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const PanelDivider = styled.hr`
  border: none;
  border-top: 1px solid ${p => p.theme.border.primary};
  margin: 0;
  flex-shrink: 0;
`;

// ─── Payment Pills ────────────────────────────────────────────────────────────

export const PayPillsRow = styled.div`
  display: flex;
  gap: 6px;
`;

export const PayPill = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 4px;
  border: 1.5px solid ${({ $active }) => ($active ? "#2563eb" : "#e8eaed")};
  border-radius: 9px;
  background: ${({ $active, theme }) => ($active ? "#eff4ff" : theme.bg.subtle)};
  color: ${({ $active }) => ($active ? "#2563eb" : "#6b7280")};
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &:hover {
    border-color: #93c5fd;
  }
`;

export const PayIcon = styled.span`
  font-size: 16px;
  line-height: 1;
`;

// ─── Customer Fields ──────────────────────────────────────────────────────────

export const CustomerRow = styled.div`
  display: flex;
  gap: 8px;
`;

// ─── Offer Select Option ──────────────────────────────────────────────────────

export const OfferOptionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 3px 0;
`;

export const OfferBadge = styled.span`
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: white;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  flex-shrink: 0;
  letter-spacing: 0.2px;
  white-space: nowrap;
`;

export const OfferOptionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const OfferOptionTitle = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
`;

export const OfferOptionDesc = styled.div`
  font-size: 11px;
  color: #9ca3af;
`;

// ─── Summary Card ─────────────────────────────────────────────────────────────

export const SummaryCard = styled.div`
  background: ${p => p.theme.bg.subtle};
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SumRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
`;

export const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  padding-top: 10px;
  border-top: 1.5px solid ${p => p.theme.border.primary};
`;

export const SavingsRow = styled.div`
  font-size: 12px;
  color: #16a34a;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  .anticon { font-size: 11px; }
`;

export const SumInput = styled(InputNumber)`
  width: 80px;
  border-radius: 7px;

  .ant-input-number-input {
    text-align: right;
  }
`;

// ─── Promo Code ───────────────────────────────────────────────────────────────

export const PromoRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;
`;

export const PromoInput = styled(Input)`
  flex: 1;
  border-radius: 9px;
  font-size: 13px;
  letter-spacing: 0.5px;

  .ant-input {
    text-transform: uppercase;
  }
`;

export const PromoApplyBtn = styled(Button)`
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
`;

export const PromoSuccessPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
`;

export const PromoClearBtn = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
  margin-left: auto;
  display: flex;
  align-items: center;

  &:hover { color: #dc2626; }
`;

// ─── Panel Footer ─────────────────────────────────────────────────────────────

export const PanelFooter = styled.div`
  padding: 14px 16px;
  border-top: 1.5px solid #e8eaed;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  background: #fff;
`;

export const ConfirmButton = styled(Button)`
  height: 44px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease !important;

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4) !important;
  }

  &:disabled {
    background: #d1d5db !important;
    box-shadow: none !important;
  }
`;

export const SecureNote = styled.div`
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  .anticon { font-size: 10px; }
`;
