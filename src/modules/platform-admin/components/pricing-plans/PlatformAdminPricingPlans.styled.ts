import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const growWidth = keyframes`
  from { width: 0 !important; }
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
  transition: background 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 8px #1677ff33;
  white-space: nowrap;

  &:hover {
    background: #0958d9;
  }
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
  display: flex;
  align-items: center;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;

  &:hover {
    border-color: #1677ff;
    color: #1677ff;
  }
`;

// ── Tabs ───────────────────────────────────────────────────────────────────

export const TabRow = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 2px solid ${({ theme }) => theme.border.primary};
  margin-bottom: 24px;
  animation: ${fadeUp} 0.3s ease both;
`;

export const TabBtn = styled.button<{ active?: boolean }>`
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ active }) => (active ? "#1677ff" : "#9ca3af")};
  background: none;
  border: none;
  border-bottom: 2px solid ${({ active }) => (active ? "#1677ff" : "transparent")};
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${({ active }) => (active ? "#1677ff" : "#6b7280")};
  }
`;

// ── Plan cards grid ────────────────────────────────────────────────────────

export const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;
  align-items: start;

  @media (max-width: 1100px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 720px)  { grid-template-columns: 1fr; }
`;

export const PlanCardWrap = styled.div<{ highlight?: "pro" | "enterprise"; delay?: number }>`
  background: ${({ theme }) => theme.bg.surface};
  border-width: 2px;
  border-style: solid;
  border-color: ${({ highlight, theme }) =>
    highlight === "pro"        ? "#bfdbfe"
    : highlight === "enterprise" ? "#fcd34d"
    : theme.border.primary};
  border-radius: 16px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  animation: ${fadeUp} 0.4s ${({ delay = 0 }) => delay}s ease both;
  box-shadow: ${({ highlight }) =>
    highlight === "pro" ? "0 0 0 1px #bfdbfe" :
    highlight === "enterprise" ? "0 0 0 1px #fcd34d" : "none"};

  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
    transform: translateY(-3px);
  }
`;

export const PlanShine = styled.div<{ color: string }>`
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${({ color }) => color};
  opacity: 0.07;
  pointer-events: none;
  transform: translate(40px, -40px);
`;

export const MostPopularBadge = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #1677ff, #38bdf8);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.3px;
`;

export const PlanIconWrap = styled.div<{ bg: string; color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ bg }) => bg};
  color: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 14px;
`;

export const OrgsBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.bg.subtle};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  color: ${({ theme }) => theme.text.muted};
  margin-bottom: 14px;
`;

export const PlanTierName = styled.div<{ color?: string }>`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ color, theme }) => color ?? theme.text.faint};
  margin-bottom: 6px;
`;

export const PlanPriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-bottom: 4px;
`;

export const PlanPrice = styled.span<{ color?: string }>`
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: ${({ color, theme }) => color ?? theme.text.primary};
`;

export const PlanPer = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.text.faint};
`;

export const PlanTagline = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.muted};
  margin: 0 0 16px;
`;

export const PlanDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.border.primary};
  margin-bottom: 14px;
`;

export const LimitsTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

export const LimitRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const LimitLabel = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.muted};
`;

export const LimitVal = styled.div<{ unlimited?: boolean }>`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ unlimited }) => (unlimited ? "#16a34a" : undefined)};
`;

export const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
`;

export const FeatureRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.muted};
`;

export const FeatureCheck = styled.span`
  color: #16a34a;
  flex-shrink: 0;
  font-size: 13px;
`;

export const FeatureX = styled.span`
  color: ${({ theme }) => theme.text.faint};
  flex-shrink: 0;
  font-size: 13px;
`;

export const EditPlanBtn = styled.button<{ btnBg?: string; btnBorder?: string; btnColor?: string }>`
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ btnBorder, theme }) => btnBorder ?? theme.border.primary};
  background: ${({ btnBg, theme }) => btnBg ?? theme.bg.layout};
  color: ${({ btnColor, theme }) => btnColor ?? theme.text.muted};
  text-align: center;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    border-color: ${({ btnColor }) => btnColor ?? "#1677ff"};
    color: ${({ btnColor }) => btnColor ?? "#1677ff"};
    background: #fff;
  }
`;

// ── Disabled feature text ──────────────────────────────────────────────────

export const DisabledFeatureText = styled.span`
  color: ${({ theme }) => theme.text.faint};
`;

// ── Assignments panel ──────────────────────────────────────────────────────

export const AssignPanel = styled.div`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeUp} 0.4s 0.25s ease both;

  /* ── Ant Table overrides (match HTML design) ── */
  .ant-table-thead > tr > th,
  .ant-table-thead > tr > td {
    padding: 10px 20px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    color: #9ca3af !important;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    background: #f8fafc !important;
    white-space: nowrap;
    border-bottom: 1px solid ${({ theme }) => theme.border.primary} !important;
  }

  .ant-table-tbody > tr > td {
    padding: 12px 20px !important;
    font-size: 13px !important;
  }

  .ant-table-tbody > tr {
    transition: background 0.12s;
  }

  .ant-table-tbody > tr:hover > td {
    background: #f8faff !important;
  }

  .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }

  .ant-tag {
    border-radius: 20px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    padding: 3px 9px !important;
    line-height: 1.2;
  }

  .ant-pagination {
    padding: 14px 20px !important;
    margin: 0 !important;
  }
`;

export const AssignToolbar = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
  display: flex;
  align-items: center;
  gap: 12px;

  /* ── Ant Input overrides ── */
  .ant-input-affix-wrapper,
  .ant-input-outlined {
    border-radius: 8px !important;
    background: ${({ theme }) => theme.bg.layout} !important;
    padding: 7px 13px !important;
    font-size: 13px !important;
  }

  /* ── Ant Select overrides ── */
  .ant-select .ant-select-selector {
    border-radius: 8px !important;
    font-size: 13px !important;
    height: auto !important;
    padding: 4px 12px !important;
  }
`;

export const ResultCount = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text.faint};
  margin-left: auto;
`;

export const UpgradeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: #1677ff;
    color: #fff;
    border-color: #1677ff;
  }
`;

// ── Edit plan modal ────────────────────────────────────────────────────────

export const ModalBackdrop = styled.div<{ open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ open }) => (open ? 1 : 0)};
  pointer-events: ${({ open }) => (open ? "auto" : "none")};
  transition: opacity 0.2s;
`;

export const ModalBox = styled.div<{ open: boolean }>`
  background: ${({ theme }) => theme.bg.surface};
  border-radius: 16px;
  width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
  transform: ${({ open }) => (open ? "scale(1) translateY(0)" : "scale(0.95) translateY(16px)")};
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

export const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const ModalIconWrap = styled.div`
  width: 36px;
  height: 36px;
  background: #eff6ff;
  color: #1677ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`;

export const ModalTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  flex: 1;
  color: ${({ theme }) => theme.text.primary};
`;

export const ModalClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: ${({ theme }) => theme.text.faint};
  padding: 2px;
  line-height: 1;
  &:hover {
    color: ${({ theme }) => theme.text.primary};
  }
`;

export const ModalBody = styled.div`
  padding: 24px;
`;

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
`;

export const FormGroup = styled.div`
  margin-bottom: 18px;
`;

export const FormLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.muted};
  margin-bottom: 6px;
  display: block;
`;

export const FormInput = styled.input`
  width: 100%;
  padding: 9px 13px;
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.text.primary};
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: ${({ theme }) => theme.bg.surface};
  box-sizing: border-box;
  &:focus {
    border-color: #1677ff;
    box-shadow: 0 0 0 3px #1677ff18;
  }
`;

export const FormHint = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.text.faint};
  margin-top: 4px;
`;

export const ModalSection = styled.div`
  margin-bottom: 18px;
`;

export const FeaturesLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.text.muted};
  margin-bottom: 6px;
  display: block;
`;

export const FeatureTogglesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 6px;
`;

export const FeatureToggleRow = styled.div<{ on: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.bg.layout};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover {
    border-color: #1677ff;
  }
`;

export const ToggleLabel = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.text.muted};
`;

export const ToggleSwitch = styled.div<{ on: boolean }>`
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: ${({ on }) => (on ? "#1677ff" : "#e5e7eb")};
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  cursor: pointer;
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transform: ${({ on }) => (on ? "translateX(16px)" : "translateX(0)")};
  }
`;

export const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.border.primary};
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

export const ModalBtnCancel = styled.button`
  background: ${({ theme }) => theme.bg.surface};
  color: ${({ theme }) => theme.text.muted};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

export const ModalBtnSave = styled.button`
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px #1677ff33;
  &:hover {
    background: #0958d9;
  }
`;

// ── Unused but exported for completeness ─────────────────────────────────

export { growWidth };
