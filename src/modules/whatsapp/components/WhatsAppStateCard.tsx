import type { ReactNode } from "react";
import { Button, Empty, Result, Skeleton } from "antd";

export function WhatsAppLoadingState() {
  return <Skeleton active paragraph={{ rows: 7 }} />;
}

export function WhatsAppEmptyState({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />;
}

export function WhatsAppErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Result
      status="error"
      title="WhatsApp setup could not be loaded"
      subTitle="Check your connection and try again. No setup changes were made."
      extra={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}

export function WhatsAppStateCard({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
