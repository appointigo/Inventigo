import styled from "@emotion/styled";
import { Space, Typography, InputNumber } from "antd";

export const FullWidthSpace = styled(Space)`
  width: 100%;
`;

export const BarcodePreview = styled.div`
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
`;

export const BarcodeSubtext = styled(Typography.Text)`
  && {
    display: block;
    margin-top: 8px;
  }
`;

export const CopiesInput = styled(InputNumber)`
  && {
    width: 100px;
    margin-left: 12px;
  }
`;

export const CopiesHint = styled(Typography.Text)`
  && {
    margin-left: 8px;
  }
`;
