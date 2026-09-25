"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Card, Drawer, Grid, Modal, Skeleton, Tooltip, Typography } from "antd";
import {
  ClockCircleOutlined,
  CrownOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CustomerList, { type DirectoryFilters } from "@/modules/customers/components/CustomerList";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import CustomerDetailView from "@/modules/customers/components/CustomerDetailView";
import CustomerFollowUpModal from "@/modules/customers/components/CustomerFollowUpModal";
import {
  customerDetailQueryKey,
  customerDirectoryQueryKey,
  customerDirectorySearchParams,
} from "@/modules/customers/customerQueries";
import { VisitForm } from "@/modules/demand-intelligence/components/DemandIntelligencePage";
import { useStore } from "@/providers/StoreProvider";
import type {
  CustomerDetailDto,
  CustomerListType,
  CustomerDto,
  CustomerUpsertInput,
  PaginatedCustomersDto,
  CustomerSortField,
  SortDirection,
} from "@/modules/customers/types";

const EMPTY_LIST: PaginatedCustomersDto = { items: [], total: 0, page: 1, pageSize: 10 };
const GROUP_LABELS = {
  all: "All Customers",
  recent: "Recently Purchased",
  repeat: "Repeat Customers",
  high_spenders: "High Spenders",
  attention: "Need Attention",
  never_purchased: "Never Purchased",
} as const;

export default function CustomersPage() {
  const { message } = App.useApp();
  const { storeId } = useStore();
  const screens = Grid.useBreakpoint();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeType, setActiveType] = useState<CustomerListType>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState("overview");
  const [sortBy, setSortBy] = useState<CustomerSortField>("lastPurchase");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<DirectoryFilters>({});

  const directoryParams = useMemo(
    () => ({
      storeId,
      search: debouncedSearch,
      type: activeType,
      page,
      pageSize,
      sortBy,
      sortDirection,
      filters,
    }),
    [activeType, debouncedSearch, filters, page, pageSize, sortBy, sortDirection, storeId]
  );
  const listQuery = useQuery({
    queryKey: customerDirectoryQueryKey(directoryParams),
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/customers?${customerDirectorySearchParams(directoryParams)}`,
        { signal }
      );
      if (!response.ok) throw new Error("Failed to load customers");
      return response.json() as Promise<PaginatedCustomersDto>;
    },
    placeholderData: (previous) => previous,
  });
  const listData = listQuery.data ?? EMPTY_LIST;

  const detailQuery = useQuery({
    queryKey: customerDetailQueryKey(selectedCustomerId),
    enabled: drawerOpen && Boolean(selectedCustomerId),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/customers/${encodeURIComponent(selectedCustomerId!)}`, {
        signal,
      });
      if (!response.ok) throw new Error("Failed to load customer details");
      return response.json() as Promise<CustomerDetailDto>;
    },
    retry: 1,
  });
  const selectedCustomer = detailQuery.data ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedCustomerId]);
  useEffect(() => {
    if (listQuery.error)
      message.error(
        listQuery.error instanceof Error ? listQuery.error.message : "Failed to load customers"
      );
  }, [listQuery.error, message]);

  const refreshCustomer = useCallback(
    async (id: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customers", "directory"] }),
        queryClient.invalidateQueries({ queryKey: customerDetailQueryKey(id) }),
      ]);
    },
    [queryClient]
  );

  const saveCustomer = useCallback(
    async (values: CustomerUpsertInput) => {
      setFormLoading(true);
      try {
        const isEdit = Boolean(editingCustomer?.id);
        const response = await fetch(
          isEdit ? `/api/customers/${encodeURIComponent(editingCustomer!.id)}` : "/api/customers",
          {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          }
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to save customer");
        const saved = payload as CustomerDto;
        setFormOpen(false);
        setSelectedCustomerId(saved.id);
        setDrawerOpen(true);
        await refreshCustomer(saved.id);
        message.success(isEdit ? "Customer updated" : "Customer created");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Failed to save customer");
      } finally {
        setFormLoading(false);
      }
    },
    [editingCustomer, message, refreshCustomer]
  );

  const detail = detailQuery.isPending ? (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 10 }} />
    </div>
  ) : detailQuery.isError ? (
    <div style={{ padding: 24 }}>
      <Alert
        type="error"
        showIcon
        message="Customer profile could not be loaded"
        description="Retry without losing your directory filters."
        action={
          <Button size="small" onClick={() => detailQuery.refetch()}>
            Retry
          </Button>
        }
      />
    </div>
  ) : (
    <CustomerDetailView
      customer={selectedCustomer}
      loading={false}
      onEdit={() => {
        if (selectedCustomer) {
          setEditingCustomer(selectedCustomer);
          setFormOpen(true);
        }
      }}
      onRecordVisit={() => setVisitOpen(true)}
      onCreateFollowUp={() => setFollowUpOpen(true)}
      onFollowUpUpdated={() => selectedCustomerId && refreshCustomer(selectedCustomerId)}
      activeTab={activeProfileTab}
      onActiveTabChange={setActiveProfileTab}
    />
  );

  const cards = [
    ["all", "All Customers", "All customers in the selected scope.", <TeamOutlined key="all" />],
    [
      "recent",
      "Recently Purchased",
      "Purchased during the last 90 days.",
      <ClockCircleOutlined key="recent" />,
    ],
    [
      "repeat",
      "Repeat Customers",
      "Made at least two purchases.",
      <UsergroupAddOutlined key="repeat" />,
    ],
    [
      "high_spenders",
      "High Spenders",
      "Top 20% by net spend during the last 12 months.",
      <CrownOutlined key="high" />,
    ],
    [
      "attention",
      "Need Attention",
      "Have not returned within their expected shopping period.",
      <WarningOutlined key="attention" />,
    ],
  ] as const;

  return (
    <div style={{ padding: screens.md ? 24 : 12, minWidth: 0, overflowX: "hidden" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Customers
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Customer activity, buying behavior and opportunities
      </Typography.Paragraph>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {cards.map(([key, label, help, icon]) => (
          <Tooltip key={key} title={help}>
            <Card
              role="button"
              tabIndex={0}
              aria-pressed={activeType === key}
              onClick={() => {
                setActiveType(key);
                setPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveType(key);
                  setPage(1);
                }
              }}
              size="small"
              style={{
                cursor: "pointer",
                borderColor: activeType === key ? "#2563eb" : undefined,
                boxShadow:
                  activeType === key
                    ? "0 0 0 2px rgba(37,99,235,.12)"
                    : "0 6px 20px rgba(15,23,42,.04)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 20, color: "#2563eb" }}>{icon}</span>
                <div>
                  <Typography.Text strong>{label}</Typography.Text>
                  <Typography.Title level={4} style={{ margin: "2px 0 0" }}>
                    {listQuery.isPending ? (
                      <Skeleton.Input size="small" active style={{ width: 45 }} />
                    ) : (
                      (listData.counts?.[key] ?? 0)
                    )}
                  </Typography.Title>
                </div>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {help}
              </Typography.Text>
            </Card>
          </Tooltip>
        ))}
      </div>
      <CustomerList
        customers={listData.items}
        loading={listQuery.isFetching}
        total={listData.total}
        page={page}
        pageSize={pageSize}
        search={search}
        heading={`${GROUP_LABELS[activeType]} — ${listData.total} customers`}
        selectedCustomerId={drawerOpen ? selectedCustomerId : null}
        onSearchChange={setSearch}
        filters={filters}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        onSortChange={(field, direction) => {
          setSortBy(field);
          setSortDirection(direction);
          setPage(1);
        }}
        onClearFilters={() => {
          setActiveType("all");
          setSearch("");
          setFilters({});
          setPage(1);
        }}
        onPageChange={(next, size) => {
          setPage(next);
          setPageSize(size);
        }}
        onSelectCustomer={(id) => {
          setSelectedCustomerId(id);
          setDrawerOpen(true);
        }}
        onCreateCustomer={() => {
          setEditingCustomer(null);
          setFormOpen(true);
        }}
      />
      <Drawer
        title="Customer profile"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={screens.md ? "min(620px, calc(100vw - 24px))" : "100vw"}
        styles={{ body: { padding: 0, overflow: "hidden" } }}
      >
        <div ref={scrollRef} style={{ height: "100%", overflowY: "auto" }}>
          {detail}
        </div>
      </Drawer>
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
          onSubmit={saveCustomer}
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
        {selectedCustomer && storeId ? (
          <VisitForm
            storeId={storeId}
            inline
            customer={{
              id: selectedCustomer.id,
              name: selectedCustomer.name,
              mobile: selectedCustomer.mobile,
            }}
            onClose={() => setVisitOpen(false)}
            onSaved={() => refreshCustomer(selectedCustomer.id)}
          />
        ) : (
          <Typography.Text type="secondary">
            Select a store and customer before recording a visit.
          </Typography.Text>
        )}
      </Modal>
      <CustomerFollowUpModal
        open={followUpOpen}
        customer={selectedCustomer}
        currentStoreId={storeId}
        onClose={() => setFollowUpOpen(false)}
        onSaved={() => (selectedCustomerId ? refreshCustomer(selectedCustomerId) : undefined)}
      />
    </div>
  );
}
