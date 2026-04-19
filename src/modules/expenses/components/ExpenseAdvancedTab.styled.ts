import styled from "@emotion/styled";
import { Card } from "antd";

// ==================== SHARED STYLES ====================
export const HeroCard = styled.div<{ gradient: string }>`
  background: ${(props) => props.gradient};
  border-radius: 14px;
  padding: 24px;
  color: #fff;
  position: relative;
  overflow: hidden;
`;

export const HeroIcon = styled.div`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 64px;
  opacity: 0.2;
`;

export const HeroAccent = styled.div`
  position: absolute;
  right: 20px;
  top: calc(50% + 32px);
  width: 3px;
  height: 24px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 2px;
`;

export const HeroTitle = styled.div`
  font-size: 13px;
  opacity: 0.85;
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
`;

export const HeroValue = styled.div<{ fontSize?: number }>`
  font-size: ${(props) => props.fontSize || 36}px;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 0;
`;

export const HeroSubtitle = styled.div`
  font-size: 12.5px;
  opacity: 0.75;
  margin-top: 4px;
`;

export const MetricBox = styled.div`
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 18px;

  & > div:first-of-type {
    font-size: 11px;
    opacity: 0.8;
    margin-bottom: 3px;
  }

  & > div:last-of-type {
    font-size: 16px;
    font-weight: 700;
  }
`;

// ==================== PETTY CASH STYLES ====================
export const LedgerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 8px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background 0.15s;

  &:hover {
    background: #f8fafc;
  }
`;

export const LedgerIcon = styled.div<{ type: "credit" | "debit" }>`
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  background: ${(props) =>
    props.type === "credit" ? "#ecfdf5" : "#fef2f2"};
`;

export const LedgerContent = styled.div`
  flex: 1;

  & > div:first-of-type {
    font-size: 13.5px;
    font-weight: 600;
  }

  & > div:last-of-type {
    font-size: 11.5px;
    color: #94a3b8;
  }
`;

export const LedgerAmount = styled.div<{ type: "credit" | "debit" }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props) =>
    props.type === "credit" ? "#10b981" : "#ef4444"};
`;

export const LedgerBalance = styled.div`
  font-size: 12px;
  color: #94a3b8;
  min-width: 80px;
  text-align: right;
`;

export const ReconcileAlert = styled.div`
  margin-top: 14px;
  padding: 12px 16px;
  background: #fffbeb;
  border-radius: 9px;
  border: 1px solid #fde68a;
  display: flex;
  align-items: center;
  justify-content: space-between;

  & span {
    font-size: 13px;
    color: #92400e;
  }
`;

// ==================== UTILITY CARD STYLES ====================
export const UtilityCardWrapper = styled(Card)`
  height: 100%;
  border-radius: 12px !important;

  &.electricity {
    background: #fffbeb;
    border-color: #fde68a !important;
  }

  &.water {
    background: #ecfeff;
    border-color: #cffafe !important;
  }

  &.internet {
    background: #f0f9ff;
    border-color: #bfdbfe !important;
  }

  &.gas {
    background: #fff7ed;
    border-color: #fed7aa !important;
  }
`;

export const UtilityIconBox = styled.div<{ bgColor: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${(props) => props.bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`;

export const UtilityTitle = styled.div<{ textColor: string }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props) => props.textColor};
`;

export const UtilitySubtitle = styled.div`
  font-size: 12px;
  color: #94a3b8;
`;

export const UtilityAmount = styled.div<{ textColor: string }>`
  font-size: 28px;
  font-weight: 800;
  color: ${(props) => props.textColor};
  margin-bottom: 4px;
`;

export const NotRecordedBox = styled.div`
  text-align: center;
  padding: 12px 0;

  & > div:first-of-type {
    font-size: 28px;
    margin-bottom: 6px;
  }

  & > div:nth-of-type(2) {
    font-size: 13px;
    font-weight: 600;
    color: #ef4444;
    margin-bottom: 4px;
  }
`;

// ==================== STAFF CLAIMS STYLES ====================
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
`;

export const StatCard = styled(Card)<{ bg: string; color: string }>`
  /* Apply background to root Card element */
  background: ${(props) => props.bg} !important;
  border: none !important;
  border-radius: 12px !important;

  /* Style the card body with proper padding */
  .ant-card-body {
    padding: 18px;
  }

  /* Style label text (first div inside body) */
  div:first-of-type {
    font-size: 10px;
    color: ${(props) => props.color};
    font-weight: 700;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  /* Style value text (last div inside body) */
  div:last-of-type {
    font-size: 28px;
    font-weight: 800;
    color: ${(props) => props.color};
    line-height: 1;
  }
`;

export const ClaimRow = styled.div<{ approved?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 10px;
  background: ${(props) => (props.approved ? "#ecfdf5" : "#f9fafb")};
  transition: all 0.2s;
  cursor: default;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateX(2px);
  }
`;

export const Avatar = styled.div<{ gradient: string }>`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
  background: ${(props) => props.gradient};
`;

export const ClaimInfo = styled.div`
  flex: 1;
  min-width: 0;

  & > div:first-of-type {
    font-size: 13.5px;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.3;
  }

  & > div:last-of-type {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 2px;
    line-height: 1.4;
  }
`;

export const ClaimTypeBox = styled.div<{ bg: string; color: string }>`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${(props) => props.bg};
  color: ${(props) => props.color};
  white-space: nowrap;
  flex-shrink: 0;
`;

export const ClaimAmountBox = styled.div`
  text-align: right;
  min-width: 75px;
  flex-shrink: 0;

  & > div:first-of-type {
    font-size: 15px;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.2;
  }

  & > div:last-of-type {
    font-size: 11.5px;
    color: #a0a0a0;
    margin-top: 2px;
  }
`;

// ==================== P&L STYLES ====================
export const ProfitHero = styled.div`
  background: linear-gradient(
    135deg,
    #0f172a,
    #1e1b4b
  );
  border-radius: 14px;
  padding: 24px;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 70% 50%,
      rgba(79, 70, 229, 0.4),
      transparent
    );
  }
`;

export const ProfitContent = styled.div`
  position: relative;
  z-index: 1;
`;

export const ProfitLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
  margin-bottom: 8px;
`;

export const ProfitValue = styled.div`
  font-size: 52px;
  font-weight: 800;
  letter-spacing: -2px;
  color: #a5f3fc;
`;

export const ProfitSubtitle = styled.div`
  font-size: 13px;
  opacity: 0.6;
  margin-top: 6px;
  margin-bottom: 12px;
`;

export const ProfitMarginBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: #6ee7b7;
`;

// ==================== P&L TABLE STYLES ====================
export const NetProfitSummaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 32px;
  align-items: center;
  background-color: #dbeafe;
  padding: 14px 16px;
  border-radius: 8px;
  margin-top: 8px;

  & > div:first-of-type {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
  }

  & > div:nth-of-type(2) {
    font-size: 16px;
    font-weight: 800;
    color: #3b82f6;
  }

  & > div:last-of-type {
    font-size: 14px;
    font-weight: 700;
    color: #3b82f6;
  }
`;

// ==================== CATEGORY MANAGER STYLES ====================
export const CategorySection = styled.div`
  margin-bottom: 8px;

  & > div:first-of-type {
    font-size: 12.5px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 8px;
  }
`;

export const ColorPickerGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ColorOption = styled.div<{ isSelected: boolean; color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  background: ${(props) => props.color};
  border: ${(props) =>
    props.isSelected
      ? `3px solid ${props.color}`
      : "2px solid transparent"};
  box-shadow: ${(props) =>
    props.isSelected
      ? `0 0 0 2px white, 0 0 0 4px ${props.color}`
      : "none"};
  transition: all 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

export const TipCard = styled(Card)`
  background: #f0fdf4 !important;
  border: 1px solid #a7f3d0 !important;
`;
