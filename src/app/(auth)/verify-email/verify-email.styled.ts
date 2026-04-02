import styled from "@emotion/styled";
import { keyframes, css } from "@emotion/react";
import { Typography } from "antd";

const { Text } = Typography;

// ─── Keyframes ───────────────────────────────────────────────────────────────

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-6px); }
  80%       { transform: translateX(6px); }
`;

// ─── OTP row (shakes on wrong code) ─────────────────────────────────────────

export const OtpRow = styled.div<{ $shake?: boolean }>`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 28px;
  ${({ $shake }) =>
    $shake &&
    css`
      animation: ${shake} 0.45s ease;
    `}
`;

// ─── Individual OTP digit box ────────────────────────────────────────────────

export const OtpInput = styled.input<{ $filled?: boolean; $error?: boolean }>`
  width: 46px;
  height: 54px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  border-radius: 10px;
  border: 1.5px solid ${({ $error }) => ($error ? "#ff8fa3" : "rgba(255,255,255,0.22)")};
  background: ${({ $filled }) =>
    $filled ? "rgba(94,207,234,0.14)" : "rgba(255,255,255,0.09)"};
  color: #fff;
  outline: none;
  caret-color: #5ecfea;
  transition: border-color 0.2s, background 0.2s;

  &:focus {
    border-color: #5ecfea;
    background: rgba(94, 207, 234, 0.12);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
  -moz-appearance: textfield;
`;

// ─── Resend countdown row ────────────────────────────────────────────────────

export const ResendRow = styled.div`
  text-align: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
`;

// ─── Error message below OTP inputs ─────────────────────────────────────────

export const OtpErrorText = styled(Text)`
  && {
    display: block;
    text-align: center;
    color: #ff8fa3;
    margin-bottom: 16px;
    font-size: 13px;
  }
`;

// ─── Mail icon circle above the OTP card ─────────────────────────────────────

export const MailIconWrap = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(94, 207, 234, 0.12);
  border: 1.5px solid rgba(94, 207, 234, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 24px;
  color: #5ecfea;
`;
