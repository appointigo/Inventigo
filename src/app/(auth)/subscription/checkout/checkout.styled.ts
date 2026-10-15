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
