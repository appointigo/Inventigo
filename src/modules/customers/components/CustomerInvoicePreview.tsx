"use client";
import { Alert, Button, Modal, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import InvoicePreview from "@/modules/billing/components/InvoicePreview";
import type { Sale } from "@/modules/billing/types";

type Props = { customerId: string; saleId: string | null; open: boolean; onClose: () => void };

export default function CustomerInvoicePreview({ customerId, saleId, open, onClose }: Props) {
  const query = useQuery({
    queryKey: ["customers", "invoice", customerId, saleId],
    enabled: open && Boolean(saleId),
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/invoices/${encodeURIComponent(saleId!)}`,
        { signal, cache: "no-store" }
      );
      if (!response.ok)
        throw new Error(
          response.status === 404
            ? "Invoice unavailable or outside your authorized scope."
            : "Invoice could not be loaded."
        );
      return response.json() as Promise<Sale>;
    },
    retry: 1,
  });

  if (query.data)
    return (
      <InvoicePreview
        sale={query.data}
        open={open}
        onClose={onClose}
        getPdfUrl={(kind, transactionId) =>
          `/api/customers/${encodeURIComponent(customerId)}/invoices/${encodeURIComponent(query.data.id)}/pdf?kind=${kind}&transactionId=${encodeURIComponent(transactionId)}`
        }
      />
    );
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Invoice preview"
      width="min(920px, calc(100vw - 24px))"
      destroyOnHidden
    >
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          message="Invoice could not be opened"
          description={query.error instanceof Error ? query.error.message : undefined}
          action={
            <Button size="small" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <Skeleton active paragraph={{ rows: 12 }} />
      )}
    </Modal>
  );
}
