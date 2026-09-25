"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Card, Col, Modal, Row, Statistic, Typography } from "antd";
import CustomerList from "@/modules/customers/components/CustomerList";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import CustomerDetailView from "@/modules/customers/components/CustomerDetailView";
import CustomerFollowUpModal from "@/modules/customers/components/CustomerFollowUpModal";
import { VisitForm } from "@/modules/demand-intelligence/components/DemandIntelligencePage";
import { useStore } from "@/providers/StoreProvider";
import type {
  CustomerDetailDto,
  CustomerListType,
  CustomerDto,
  CustomerUpsertInput,
  PaginatedCustomersDto,
} from "@/modules/customers/types";

const INITIAL_LIST: PaginatedCustomersDto = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
};

export default function CustomersPage() {
  const { message } = App.useApp();
  const { storeId } = useStore();
  const [listData, setListData] = useState<PaginatedCustomersDto>(INITIAL_LIST);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<CustomerListType>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [insights, setInsights] = useState<{ totalCustomers: number; activeCustomers: number; repeatCustomers: number; highValueCustomers: number; atRiskCustomers: number } | null>(null);

  const selectedFromList = useMemo(
    () => listData.items.find((row) => row.id === selectedCustomerId) ?? null,
    [listData.items, selectedCustomerId]
  );

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("type", activeType);
      params.set("highSpenderThreshold", "10000");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const response = await fetch(`/api/customers?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load customers");
      }

      const payload = (await response.json()) as PaginatedCustomersDto;
      setListData(payload);

      if (!selectedCustomerId || !payload.items.some(item => item.id === selectedCustomerId)) {
        setSelectedCustomerId(payload.items[0]?.id ?? null);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load customers";
      message.error(text);
    } finally {
      setLoadingList(false);
    }
  }, [activeType, message, page, pageSize, search, selectedCustomerId]);

  const fetchCustomerDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const response = await fetch(`/api/customers/${encodeURIComponent(id)}`);
        if (!response.ok) {
          throw new Error("Failed to load customer details");
        }

        const payload = (await response.json()) as CustomerDetailDto;
        setSelectedCustomer(payload);
        setEditingCustomer(payload);
      } catch (error) {
        const text = error instanceof Error ? error.message : "Failed to load customer details";
        message.error(text);
        setSelectedCustomer(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [message]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => { fetch("/api/customers/insights", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(setInsights).catch(() => setInsights(null)); }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null);
      return;
    }
    fetchCustomerDetail(selectedCustomerId);
  }, [fetchCustomerDetail, selectedCustomerId]);

  const handleSaveCustomer = useCallback(
    async (values: CustomerUpsertInput) => {
      setFormLoading(true);
      try {
        const isEdit = Boolean(editingCustomer?.id);
        const url = isEdit
          ? `/api/customers/${encodeURIComponent(editingCustomer!.id)}`
          : "/api/customers";
        const method = isEdit ? "PATCH" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to save customer");
        }

        const saved = payload as CustomerDto;
        setFormOpen(false);
        setSelectedCustomerId(saved.id);
        message.success(isEdit ? "Customer updated" : "Customer created");
        await fetchList();
        await fetchCustomerDetail(saved.id);
      } catch (error) {
        const text = error instanceof Error ? error.message : "Failed to save customer";
        message.error(text);
      } finally {
        setFormLoading(false);
      }
    },
    [editingCustomer, fetchCustomerDetail, fetchList, message]
  );

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 20 }}>
        Customers
      </Typography.Title>
      <Typography.Paragraph type="secondary">Customer activity, buying behavior and opportunities</Typography.Paragraph>
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[["Total Customers", insights?.totalCustomers ?? 0, "All customer records"], ["Active Customers", insights?.activeCustomers ?? 0, "Purchased in last 90 days"], ["Repeat Customers", insights?.repeatCustomers ?? 0, "2+ qualifying orders"], ["High Value Customers", insights?.highValueCustomers ?? 0, "Top 20% by spend"], ["At Risk Customers", insights?.atRiskCustomers ?? 0, "Overdue customers"]].map(([title, value, helper]) => <Col xs={12} lg={8} flex="1 1 190px" key={String(title)}><Card size="small" style={{ borderRadius: 12, boxShadow: "0 6px 20px rgba(15,23,42,.04)" }}><Statistic title={title} value={value} /><Typography.Text type="secondary" style={{ fontSize: 11 }}>{helper}</Typography.Text></Card></Col>)}
      </Row>

      <Row gutter={16}>
        <Col xs={24} xl={14}>
          <CustomerList
            customers={listData.items}
            loading={loadingList}
            total={listData.total}
            page={page}
            pageSize={pageSize}
            search={search}
            activeType={activeType}
            selectedCustomerId={selectedCustomerId}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onTypeChange={(type) => {
              setActiveType(type);
              setPage(1);
            }}
            onPageChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
            onSelectCustomer={setSelectedCustomerId}
            onCreateCustomer={() => {
              setEditingCustomer(null);
              setFormOpen(true);
            }}
          />
        </Col>

        <Col xs={24} xl={10}>
          <CustomerDetailView
            customer={selectedCustomer}
            loading={loadingDetail}
            onEdit={() => {
              if (!selectedCustomer && !selectedFromList) return;
              setEditingCustomer(selectedCustomer);
              setFormOpen(true);
            }}
            onRecordVisit={() => setVisitOpen(true)}
            onCreateFollowUp={() => setFollowUpOpen(true)}
            onFollowUpUpdated={() => selectedCustomerId && fetchCustomerDetail(selectedCustomerId)}
          />
        </Col>
      </Row>

      <Modal
        open={formOpen}
        title={editingCustomer?.id ? "Edit Customer" : "Create Customer"}
        onCancel={() => setFormOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <CustomerForm
          initialValues={editingCustomer}
          loading={formLoading}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSaveCustomer}
        />
      </Modal>
      <Modal open={visitOpen} title="Record Customer Visit" footer={null} width={760} onCancel={() => setVisitOpen(false)} destroyOnHidden>
        {selectedCustomer && storeId ? <VisitForm storeId={storeId} inline customer={{ id: selectedCustomer.id, name: selectedCustomer.name, mobile: selectedCustomer.mobile }} onClose={() => setVisitOpen(false)} onSaved={() => fetchCustomerDetail(selectedCustomer.id)} /> : <Typography.Text type="secondary">Select a store and customer before recording a visit.</Typography.Text>}
      </Modal>
      <CustomerFollowUpModal open={followUpOpen} customer={selectedCustomer} currentStoreId={storeId} onClose={() => setFollowUpOpen(false)} onSaved={() => selectedCustomerId ? fetchCustomerDetail(selectedCustomerId) : undefined} />
    </div>
  );
}
