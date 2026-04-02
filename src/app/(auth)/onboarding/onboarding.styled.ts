import styled from "@emotion/styled";
import { Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { GlassCard } from "@/app/(auth)/login/login.styled";

const { Text } = Typography;

// ─── Extends GlassCard with wider max-width for the wizard ───────────────────

export const OnboardingCard = styled(GlassCard)`
  max-width: 840px;
  padding: 36px 32px 28px;
`;

// ─── Plan selection grid ─────────────────────────────────────────────────────

export const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const PlanCard = styled.div<{ $selected?: boolean }>`
  border: 1.5px solid
    ${({ $selected }) => ($selected ? "#5ecfea" : "rgba(255,255,255,0.14)")};
  border-radius: 14px;
  padding: 20px 16px;
  background: ${({ $selected }) =>
    $selected ? "rgba(94,207,234,0.1)" : "rgba(255,255,255,0.04)"};
  cursor: pointer;
  text-align: center;
  position: relative;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: ${({ $selected }) => ($selected ? "#5ecfea" : "rgba(255,255,255,0.3)")};
  }
`;

export const PopularBadge = styled.span`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #5ecfea;
  color: #071e28;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 2px 10px;
  border-radius: 20px;
`;

export const PlanSelectedIcon = styled(CheckCircleFilled)`
  position: absolute;
  top: 10px;
  right: 10px;
  color: #5ecfea;
  font-size: 14px;
`;

export const PlanName = styled(Text)`
  && {
    display: block;
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 4px;
  }
`;

export const PlanPrice = styled(Text)`
  && {
    display: block;
    color: #5ecfea;
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 4px;
  }
`;

export const PlanPeriod = styled(Text)`
  && {
    display: block;
    color: rgba(255, 255, 255, 0.38);
    font-size: 11px;
    margin-bottom: 6px;
  }
`;

export const PlanDesc = styled(Text)`
  && {
    display: block;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11.5px;
    line-height: 1.5;
    margin-bottom: 0;
  }
`;

export const PlanDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 12px 0;
`;

export const PlanFeatsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
`;

export const PlanFeatsItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 0;
  line-height: 1.4;
`;

export const PlanCheckMark = styled.span`
  color: #5ecfea;
  font-size: 13px;
  flex-shrink: 0;
  margin-top: 1px;
`;

// ─── Step 2 back / complete row ──────────────────────────────────────────────

export const StepNavRow = styled.div`
  display: flex;
  gap: 12px;
`;

// ─── Back button (outlined glass style) ─────────────────────────────────────

export const BackBtn = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  flex: 1;
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.35);
  }
`;

export const StepBackBtn = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  flex: 1;
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.35);
  }
`;

// ─── Inline info banners (pro / enterprise plan notes) ───────────────────────

export const ProBanner = styled.div`
  background: rgba(94, 207, 234, 0.07);
  border: 1px solid rgba(94, 207, 234, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
`;

export const EnterpriseBanner = styled.div`
  background: rgba(200, 126, 255, 0.07);
  border: 1px solid rgba(200, 126, 255, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
`;
