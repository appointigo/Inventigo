"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Alert, App, Breadcrumb, Button, Modal, Skeleton, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CustomerDetailView from "./CustomerDetailView";
import CustomerForm from "./CustomerForm";
import CustomerFollowUpModal from "./CustomerFollowUpModal";
import CustomerInvoicePreview from "./CustomerInvoicePreview";
import { VisitForm } from "@/modules/demand-intelligence/components/DemandIntelligencePage";
import { customerDetailQueryKey } from "../customerQueries";
import { safeCustomerReturnPath } from "../customerDirectoryState";
import { useStore } from "@/providers/StoreProvider";
import type { CustomerDetailDto, CustomerDto, CustomerUpsertInput } from "../types";

type Props = { customerId: string; returnTo: string | null; initialTab: string | null };
const validTabs = ["overview", "purchases", "preferences", "demand", "engagement"];

export default function CustomerFullProfile({ customerId, returnTo, initialTab }: Props) {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const backHref = safeCustomerReturnPath(returnTo);
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(initialTab ?? "") ? initialTab! : "overview"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [invoiceSaleId, setInvoiceSaleId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: customerDetailQueryKey(customerId),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, { signal });
      if (!response.ok)
        throw new Error(
          response.status === 404
            ? "Customer unavailable or outside your authorized scope"
            : "Failed to load customer profile"
        );
      return response.json() as Promise<CustomerDetailDto>;
    },
    retry: 1,
  });
  const customer = detailQuery.data ?? null;
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: customerDetailQueryKey(customerId) }),
      queryClient.invalidateQueries({ queryKey: ["customers", "directory"] }),
    ]);
  }, [customerId, queryClient]);

  const save = async (values: CustomerUpsertInput) => {
    setFormLoading(true);
    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to update customer");
      setFormOpen(false);
      await refresh();
      message.success("Customer updated");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to update customer");
    } finally {
      setFormLoading(false);
    }
  };
  const changeTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    if (returnTo) params.set("returnTo", returnTo);
    if (tab !== "overview") params.set("tab", tab);
    router.replace(
      `/dashboard/customers/${encodeURIComponent(customerId)}${params.size ? `?${params}` : ""}`,
      { scroll: false }
    );
  };

  if (detailQuery.isPending)
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 14 }} />
      </div>
    );
  if (detailQuery.isError)
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="Customer profile unavailable"
          description={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "Unable to load this customer."
          }
          action={<Button onClick={() => detailQuery.refetch()}>Retry</Button>}
        />
        <Link href={backHref}>
          <Button icon={<ArrowLeftOutlined />} style={{ marginTop: 16 }}>
            Back to Customers
          </Button>
        </Link>
      </div>
    );

  return (
    <div style={{ padding: 24, minWidth: 0, overflowX: "hidden" }}>
      <Breadcrumb
        items={[
          { title: <Link href={backHref}>Customers</Link> },
          { title: customer?.name || "Customer profile" },
        ]}
        style={{ marginBottom: 12 }}
      />
      <Link href={backHref}>
        <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
          Back to Customers
        </Button>
      </Link>
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        Customer Profile
      </Typography.Title>
      <CustomerDetailView
        customer={customer}
        loading={false}
        activeTab={activeTab}
        onActiveTabChange={changeTab}
        onEdit={() => setFormOpen(true)}
        onRecordVisit={() => setVisitOpen(true)}
        onCreateFollowUp={() => setFollowUpOpen(true)}
        onFollowUpUpdated={refresh}
        onViewInvoice={setInvoiceSaleId}
      />
      <CustomerInvoicePreview
        customerId={customerId}
        saleId={invoiceSaleId}
        open={Boolean(invoiceSaleId)}
        onClose={() => setInvoiceSaleId(null)}
      />
      <Modal
        open={formOpen}
        title="Edit Customer"
        footer={null}
        onCancel={() => setFormOpen(false)}
        destroyOnHidden
      >
        <CustomerForm
          initialValues={customer as CustomerDto}
          loading={formLoading}
          onCancel={() => setFormOpen(false)}
          onSubmit={save}
        />
      </Modal>
      <Modal
        open={visitOpen}
        title="Record Customer Visit"
        footer={null}
        width={760}
        onCancel={() => setVisitOpen(false)}
        destroyOnHidden
      >
        {customer && storeId ? (
          <VisitForm
            storeId={storeId}
            inline
            customer={{ id: customer.id, name: customer.name, mobile: customer.mobile }}
            onClose={() => setVisitOpen(false)}
            onSaved={refresh}
          />
        ) : (
          <Typography.Text type="secondary">
            Select a store before recording a visit.
          </Typography.Text>
        )}
      </Modal>
      <CustomerFollowUpModal
        open={followUpOpen}
        customer={customer}
        currentStoreId={storeId}
        onClose={() => setFollowUpOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
