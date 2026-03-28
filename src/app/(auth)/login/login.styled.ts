import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, Typography, Divider, Form } from "antd";
import { BoxPlotOutlined } from "@ant-design/icons";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const spinSlow = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const cardEntrance = keyframes`
  from { opacity: 0; transform: translateY(32px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1);    }
`;

const floatParticle = keyframes`
  0%, 100% { transform: translateY(0px)   scale(1);    opacity: 0.18; }
  50%       { transform: translateY(-50px) scale(1.15); opacity: 0.32; }
`;

// ─── Scene ────────────────────────────────────────────────────────────────────

export const SceneWrapper = styled.div`
  min-height: 100vh;
  position: relative;
  background-image: url("/stockiva_banner.png");
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(4, 16, 24, 0.72) 0%,
    rgba(7, 30, 42, 0.68) 60%,
    rgba(4, 16, 24, 0.78) 100%
  );
`;

// ─── Decorative elements ──────────────────────────────────────────────────────

export const OrbitRing = styled.div<{ $size: number; $index: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin-top: ${({ $size }) => -$size / 2}px;
  margin-left: ${({ $size }) => -$size / 2}px;
  border: 1px solid rgba(94, 207, 234, 0.08);
  border-radius: 50%;
  animation: ${spinSlow} ${({ $index }) => 24 + $index * 10}s linear infinite;
  animation-direction: ${({ $index }) => ($index % 2 === 0 ? "normal" : "reverse")};
  pointer-events: none;
`;

export const Particle = styled.div<{
  $w: number;
  $top: string;
  $left: string;
  $dur: string;
  $delay: string;
}>`
  position: absolute;
  width: ${({ $w }) => $w}px;
  height: ${({ $w }) => $w}px;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  border-radius: 50%;
  background: rgba(94, 207, 234, 0.22);
  animation: ${floatParticle} ${({ $dur }) => $dur} ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
  pointer-events: none;
`;

// ─── Logo ─────────────────────────────────────────────────────────────────────

export const LogoRow = styled.div`
  position: absolute;
  top: 28px;
  left: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
`;

export const LogoIcon = styled(BoxPlotOutlined)`
  font-size: 26px !important;
  color: #5ecfea !important;
`;

export const LogoText = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.4px;
`;

// ─── Glass Card ───────────────────────────────────────────────────────────────

export const GlassCard = styled.div`
  position: relative;
  z-index: 2;
  background: rgba(8, 28, 40, 0.72);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 20px;
  padding: 40px 40px 32px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.55);
  animation: ${cardEntrance} 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  /* ── Ant Design input overrides, scoped to this card ── */
  .ant-input-affix-wrapper,
  .ant-input {
    background: rgba(255, 255, 255, 0.13) !important;
    border-color: rgba(255, 255, 255, 0.28) !important;
    color: #fff !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
  }

  .ant-input-affix-wrapper .ant-input {
    background: transparent !important;
    padding: 0 !important;
  }

  .ant-input-affix-wrapper:hover,
  .ant-input-affix-wrapper-focused {
    border-color: #5ecfea !important;
  }

  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.38) !important;
  }

  .ant-input-prefix svg,
  .ant-input-suffix svg {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .ant-input-password-icon {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .ant-form-item-explain-error {
    color: #ff8fa3 !important;
  }

  .ant-divider {
    border-color: rgba(255, 255, 255, 0.12) !important;
  }

  .ant-divider-inner-text {
    color: rgba(255, 255, 255, 0.3) !important;
    font-size: 12px;
  }

  @media (max-width: 480px) {
    padding: 28px 20px 24px;
    margin: 16px;
  }
`;

// ─── Tab Toggle ───────────────────────────────────────────────────────────────

export const TabRow = styled.div`
  display: inline-flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 4px;
  margin-bottom: 28px;
`;

export const TabBtn = styled.button<{ $active?: boolean }>`
  padding: 7px 22px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: ${({ $active }) => ($active ? "#5ecfea" : "transparent")};
  color: ${({ $active }) => ($active ? "#071e28" : "rgba(255,255,255,0.45)")};
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? "#071e28" : "#fff")};
  }
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const GoogleBtn = styled(Button)`
  && {
    width: 100%;
    height: auto;
    padding: 11px 16px;
    border: 1.5px solid rgba(255, 255, 255, 0.18);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
    box-shadow: none;

    &:hover,
    &:focus {
      background: rgba(255, 255, 255, 0.14) !important;
      border-color: #5ecfea !important;
      color: #fff !important;
      box-shadow: none !important;
    }
  }
`;

export const SubmitBtn = styled(Button)`
  && {
    width: 100%;
    height: auto;
    padding: 13px;
    border-radius: 8px;
    background: #5ecfea;
    border: none;
    color: #071e28;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 16px;
    letter-spacing: 0.2px;
    box-shadow: none;

    &:hover,
    &:focus {
      background: #79d9ef !important;
      border: none !important;
      color: #071e28 !important;
      box-shadow: none !important;
    }

    &:active {
      transform: scale(0.98);
    }
  }
`;

export const BackBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  margin-bottom: 24px;
  font-size: 13px;

  &:hover {
    color: #fff;
  }
`;

export const LinkBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #5ecfea;
  font-weight: 600;
  padding: 0;
  font-size: 13px;

  &:hover {
    text-decoration: underline;
  }
`;

export const ForgotLink = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #5ecfea;
  font-size: 13px;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

// ─── Typography ───────────────────────────────────────────────────────────────

export const CardTitle = styled(Typography.Title)`
  && {
    color: #fff;
    margin-bottom: 4px;
  }
`;

export const CardSubtext = styled(Typography.Text)<{ $mb?: number }>`
  && {
    display: block;
    margin-bottom: ${({ $mb }) => $mb ?? 24}px;
    color: rgba(255, 255, 255, 0.5);
  }
`;

export const FooterText = styled(Typography.Text)`
  && {
    display: block;
    text-align: center;
    margin-top: 28px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.18);
  }
`;

// ─── Layout helpers ───────────────────────────────────────────────────────────

export const AuthDivider = styled(Divider)`
  && {
    margin: 0 0 20px;
  }
`;

export const ForgotRow = styled.div`
  text-align: right;
  margin-bottom: 20px;
`;

export const BottomRow = styled.div`
  text-align: center;
  margin-top: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
`;

export const TightFormItem = styled(Form.Item)`
  && {
    margin-bottom: 8px;
  }
`;
