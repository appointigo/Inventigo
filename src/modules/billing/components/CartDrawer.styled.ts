import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, Input, InputNumber } from "antd";

// ─── Keyframes ────────────────────────────────────────────────────────────────

export const slideItem = keyframes`
  from { opacity: 0; transform: translateX(14px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ─── Drawer Header ────────────────────────────────────────────────────────────

export const DrawerTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const DrawerTitleText = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  letter-spacing: -0.2px;
`;

export const ItemCountBadge = styled.span`
  background: #eff4ff;
  color: #2563eb;
  border: 1.5px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 9px;
`;

// ─── Progress Steps ───────────────────────────────────────────────────────────

export const StepsBar = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 20px 12px;
  border-bottom: 1px solid #e8eaed;
`;

export const StepItem = styled.div<{ $state: "done" | "active" | "idle" }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  position: relative;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 14px;
    left: calc(50% + 18px);
    right: calc(-50% + 18px);
    height: 2px;
    background: ${({ $state }) =>
      $state === "done" ? "#2563eb" : "#e8eaed"};
    transition: background 0.3s;
  }
`;

export const StepCircle = styled.div<{ $state: "done" | "active" | "idle" }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  z-index: 1;
  transition: all 0.3s;
  flex-shrink: 0;

  .anticon { font-size: 11px; }

  ${({ $state }) =>
    $state === "done" &&
    `background: #2563eb; color: white;`}
  ${({ $state }) =>
    $state === "active" &&
    `background: #2563eb; color: white; box-shadow: 0 0 0 4px rgba(37,99,235,0.2);`}
  ${({ $state }) =>
    $state === "idle" &&
    `background: #f8f9fc; color: #9ca3af; border: 2px solid #e8eaed;`}
`;

export const StepLabel = styled.span<{ $active: boolean }>`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? "#2563eb" : "#9ca3af")};
  white-space: nowrap;
`;

// ─── Cart Items ───────────────────────────────────────────────────────────────

export const CartItemsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e8eaed;
    border-radius: 2px;
  }
`;

export const CartItemCard = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: ${p => p.theme.bg.subtle};
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 12px;
  padding: 12px 14px;
  animation: ${slideItem} 0.25s ease both;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: #bfdbfe;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06);
  }
`;

export const ItemEmoji = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

export const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ItemNameText = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ItemMetaText = styled.span`
  font-size: 11.5px;
  color: #9ca3af;
  margin-top: 3px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`;

export const SizeChip = styled.span`
  display: inline-block;
  background: #eff4ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
`;

export const AttrChip = styled.span`
  display: inline-block;
  background: ${p => p.theme.bg.muted};
  color: ${p => p.theme.text.secondary};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 6px;
`;

export const ItemPriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

export const UnitPriceText = styled.span`
  font-size: 12px;
  color: ${p => p.theme.text.muted};
`;

export const LineTotalText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.text.primary};
  margin-left: auto;
`;

// ─── Quantity Controller ──────────────────────────────────────────────────────

export const QtyController = styled.div`
  display: flex;
  align-items: center;
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 8px;
  overflow: hidden;
  background: ${p => p.theme.bg.surface};
`;

export const QtyControlBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  color: #6b7280;
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
  min-width: 32px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  border-left: 1px solid #e8eaed;
  border-right: 1px solid #e8eaed;
  line-height: 28px;
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

// ─── Empty Cart ───────────────────────────────────────────────────────────────

export const EmptyCartWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 0;
  color: #9ca3af;
`;

export const EmptyCartIcon = styled.div`
  opacity: 0.3;
  font-size: 48px;
`;

export const EmptyCartText = styled.span`
  font-size: 13.5px;
  color: #6b7280;
`;

// ─── Section Labels ───────────────────────────────────────────────────────────

export const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
`;

// ─── Payment Method Pills ─────────────────────────────────────────────────────

export const PayPillsRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const PayPill = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 9px 4px;
  border: 1.5px solid ${({ $active }) => ($active ? "#2563eb" : "#e8eaed")};
  border-radius: 9px;
  background: ${({ $active }) => ($active ? "#eff4ff" : "#f8f9fc")};
  color: ${({ $active }) => ($active ? "#2563eb" : "#6b7280")};
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;

  &:hover {
    border-color: #93c5fd;
  }
`;

export const PayIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

// ─── Customer Fields ──────────────────────────────────────────────────────────

export const CustomerRow = styled.div`
  display: flex;
  gap: 8px;
`;

// ─── Footer Summary Card ──────────────────────────────────────────────────────

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
  width: 84px;
  border-radius: 7px;

  .ant-input-number-input {
    text-align: right;
  }
`;

// ─── Drawer Footer ────────────────────────────────────────────────────────────

export const DrawerFooter = styled.div`
  padding: 14px 20px;
  border-top: 1px solid #e8eaed;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const ConfirmButton = styled(Button)`
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
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

export const BackLink = styled.button`
  background: transparent;
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 10px;
  padding: 9px;
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.theme.text.muted};
  cursor: pointer;
  width: 100%;
  transition: all 0.15s;

  &:hover {
    background: ${p => p.theme.bg.subtle};
    color: ${p => p.theme.text.primary};
  }
`;

export const SecureNote = styled.div`
  text-align: center;
  font-size: 11.5px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  .anticon { font-size: 11px; }
`;

// ─── Drawer Body ──────────────────────────────────────────────────────────────

export const DrawerSection = styled.div`
  padding: 14px 20px 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const CartDivider = styled.hr`
  border: none;
  border-top: 1px solid ${p => p.theme.border.primary};
  margin: 0;
`;

// ─── Promo Code ───────────────────────────────────────────────────────────────

export const PromoRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const PromoInput = styled(Input)`
  flex: 1;
  border-radius: 9px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const PromoApplyBtn = styled(Button)`
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  height: 32px;
`;

export const PromoSuccessPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 8px;
  padding: 5px 10px;
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

  &:hover { color: #dc2626; }
`;

// ─── Available Offers ─────────────────────────────────────────────────────────

export const OffersGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const OfferCard = styled.div<{ $applied: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1.5px solid ${({ $applied }) => ($applied ? "#bbf7d0" : "#e8eaed")};
  border-radius: 10px;
  background: ${({ $applied, theme }) => ($applied ? "#f0fdf4" : theme.bg.subtle)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ $applied }) => ($applied ? "#86efac" : "#93c5fd")};
    background: ${({ $applied }) => ($applied ? "#dcfce7" : "#eff4ff")};
  }
`;

export const OfferBadge = styled.span`
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: white;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  flex-shrink: 0;
  letter-spacing: 0.3px;
`;

export const OfferInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const OfferTitle = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
`;

export const OfferDesc = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
`;

export const OfferAppliedTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #16a34a;
  flex-shrink: 0;
`;
