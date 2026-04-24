"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Col, Modal, Row, Typography } from "antd";
import CustomerList from "@/modules/customers/components/CustomerList";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import CustomerDetailView from "@/modules/customers/components/CustomerDetailView";
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

      if (!selectedCustomerId && payload.items.length) {
        setSelectedCustomerId(payload.items[0].id);
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

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <CustomerList
            customers={listData.items}
            loading={loadingList}
            total={listData.total}
            page={page}
            pageSize={pageSize}
            search={search}
            activeType={activeType}
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

        <Col xs={24} lg={10}>
          <CustomerDetailView
            customer={selectedCustomer}
            loading={loadingDetail}
            onEdit={() => {
              if (!selectedCustomer && !selectedFromList) return;
              setEditingCustomer(selectedCustomer);
              setFormOpen(true);
            }}
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
    </div>
  );
}
