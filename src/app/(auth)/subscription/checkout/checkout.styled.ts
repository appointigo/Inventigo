import styled from "@emotion/styled";
import { Button } from "antd";

export const CheckoutActionButton = styled(Button)`
  && {
    min-height: 48px;
    border-radius: 8px;
    border: 1px solid #5ecfea;
    background: #5ecfea;
    color: #071e28;
    font-weight: 700;
    box-shadow: none;
  }

  &&:hover:not(:disabled),
  &&:focus-visible:not(:disabled) {
    border-color: #79d9ef;
    background: #79d9ef;
    color: #071e28;
  }

  &&:disabled {
    border-color: rgba(255, 255, 255, 0.45);
    background: rgba(255, 255, 255, 0.12);
    color: #f4fbfd;
    opacity: 1;
  }
`;

export const CheckoutSecondaryButton = styled(Button)`
  && {
    margin-top: 12px;
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.45);
    background: transparent;
    color: #f4fbfd;
    font-weight: 600;
  }

  &&:hover:not(:disabled),
  &&:focus-visible:not(:disabled) {
    border-color: #5ecfea;
    background: rgba(94, 207, 234, 0.1);
    color: #fff;
  }
`;
