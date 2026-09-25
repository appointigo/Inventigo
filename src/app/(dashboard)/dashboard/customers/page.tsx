"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Card, Drawer, Grid, Modal, Skeleton, Tooltip, Typography } from "antd";
import {
  ClockCircleOutlined,
  CloseOutlined,
  CrownOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CustomerList, { type DirectoryFilters } from "@/modules/customers/components/CustomerList";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import CustomerQuickView from "@/modules/customers/components/CustomerQuickView";
import CustomerFollowUpModal from "@/modules/customers/components/CustomerFollowUpModal";
import {
  customerDetailQueryKey,
  customerDirectoryQueryKey,
  customerDirectorySearchParams,
} from "@/modules/customers/customerQueries";
import {
  getCustomerNavigationTargets,
  type CustomerNavigationTarget,
} from "@/modules/customers/customerNavigation";
import {
  customerProfileHref,
  parseCustomerDirectoryState,
  serializeCustomerDirectoryState,
} from "@/modules/customers/customerDirectoryState";
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

const EMPTY_LIST: PaginatedCustomersDto = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};
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
  const { storeId, setStore } = useStore();
  const screens = Grid.useBreakpoint();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterScopeRef = useRef<string | null>(null);
  const didRestoreDirectoryRef = useRef(false);
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
  const [sortBy, setSortBy] = useState<CustomerSortField>("lastPurchase");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<DirectoryFilters>({});
  const [directoryRestored, setDirectoryRestored] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<CustomerNavigationTarget | null>(null);
  const isDocked = Boolean(screens.lg);

  useEffect(() => {
    if (didRestoreDirectoryRef.current) return;
    didRestoreDirectoryRef.current = true;
    const restored = parseCustomerDirectoryState(new URLSearchParams(window.location.search));
    setSearch(restored.search ?? "");
    setDebouncedSearch(restored.search ?? "");
    setActiveType(restored.type ?? "all");
    setPage(restored.page ?? 1);
    setPageSize(restored.pageSize ?? 10);
    setSortBy(restored.sortBy ?? "lastPurchase");
    setSortDirection(restored.sortDirection ?? "desc");
    setFilters(restored.filters ?? {});
    if (restored.storeId && restored.storeId !== storeId) {
      fetch("/api/stores")
        .then((response) => (response.ok ? response.json() : []))
        .then((stores: Array<{ id: string; name: string }>) => {
          const store = stores.find((item) => item.id === restored.storeId);
          if (store) setStore(store.id, store.name);
        })
        .finally(() => setDirectoryRestored(true));
    } else setDirectoryRestored(true);
  }, [setStore, storeId]);

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
    enabled: directoryRestored,
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

  const closeProfile = useCallback(() => {
    setDrawerOpen(false);
    setSelectedCustomerId(null);
    setPendingNavigation(null);
    setFormOpen(false);
    setVisitOpen(false);
    setFollowUpOpen(false);
    setEditingCustomer(null);
  }, []);

  const selectCustomer = useCallback((id: string) => {
    setFormOpen(false);
    setVisitOpen(false);
    setFollowUpOpen(false);
    setEditingCustomer(null);
    setPendingNavigation(null);
    setSelectedCustomerId(id);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (!directoryRestored || search === debouncedSearch) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, directoryRestored, search]);
  const directoryState = useMemo(
    () => ({ search, type: activeType, page, pageSize, sortBy, sortDirection, filters, storeId }),
    [activeType, filters, page, pageSize, search, sortBy, sortDirection, storeId]
  );
  useEffect(() => {
    if (!directoryRestored) return;
    const query = serializeCustomerDirectoryState(directoryState).toString();
    window.history.replaceState(
      window.history.state,
      "",
      `/dashboard/customers${query ? `?${query}` : ""}`
    );
  }, [directoryRestored, directoryState]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedCustomerId]);
  useEffect(() => {
    if (listQuery.error)
      message.error(
        listQuery.error instanceof Error ? listQuery.error.message : "Failed to load customers"
      );
  }, [listQuery.error, message]);
  useEffect(() => {
    if (!listQuery.isFetching && listQuery.data && listQuery.data.page !== page)
      setPage(listQuery.data.page);
  }, [listQuery.data, listQuery.isFetching, page]);

  const filterScope = useMemo(
    () =>
      JSON.stringify({
        storeId,
        search: debouncedSearch,
        activeType,
        pageSize,
        sortBy,
        sortDirection,
        filters,
      }),
    [activeType, debouncedSearch, filters, pageSize, sortBy, sortDirection, storeId]
  );
  useEffect(() => {
    if (filterScopeRef.current !== null && filterScopeRef.current !== filterScope) closeProfile();
    filterScopeRef.current = filterScope;
  }, [closeProfile, filterScope]);

  useEffect(() => {
    if (!pendingNavigation || listQuery.isFetching || listData.page !== pendingNavigation.page)
      return;
    const target = listData.items[pendingNavigation.index];
    if (target) selectCustomer(target.id);
    else closeProfile();
  }, [
    closeProfile,
    listData.items,
    listData.page,
    listQuery.isFetching,
    pendingNavigation,
    selectCustomer,
  ]);

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
    <CustomerQuickView
      customer={selectedCustomer!}
      fullProfileHref={customerProfileHref(selectedCustomer!.id, directoryState)}
      onEdit={() => {
        if (selectedCustomer) {
          setEditingCustomer(selectedCustomer);
          setFormOpen(true);
        }
      }}
      onRecordVisit={() => setVisitOpen(true)}
      onCreateFollowUp={() => setFollowUpOpen(true)}
    />
  );

  const navigation = getCustomerNavigationTargets({
    selectedCustomerId,
    itemIds: listData.items.map((item) => item.id),
    page: listData.page,
    pageSize: listData.pageSize,
    total: listData.total,
  });
  const navigate = (target: CustomerNavigationTarget | null) => {
    if (!target) return;
    if (target.page === listData.page) {
      const customer = listData.items[target.index];
      if (customer) selectCustomer(customer.id);
      return;
    }
    setPendingNavigation(target);
    setPage(target.page);
  };
  const profileHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
      }}
    >
      <Typography.Text strong>Customer profile</Typography.Text>
      <div style={{ display: "flex", gap: 4 }}>
        <Tooltip title="Previous customer">
          <Button
            aria-label="Previous customer"
            size="small"
            icon={<LeftOutlined />}
            disabled={!navigation.previous || Boolean(pendingNavigation)}
            onClick={() => navigate(navigation.previous)}
          />
        </Tooltip>
        <Tooltip title="Next customer">
          <Button
            aria-label="Next customer"
            size="small"
            icon={<RightOutlined />}
            disabled={!navigation.next || Boolean(pendingNavigation)}
            onClick={() => navigate(navigation.next)}
          />
        </Tooltip>
        <Tooltip title="Close profile">
          <Button
            aria-label="Close customer profile"
            size="small"
            icon={<CloseOutlined />}
            onClick={closeProfile}
          />
        </Tooltip>
      </div>
    </div>
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
      <div
        style={{
          display: isDocked && drawerOpen ? "grid" : "block",
          gridTemplateColumns:
            isDocked && drawerOpen ? "minmax(0, 1fr) clamp(360px, 38%, 460px)" : undefined,
          gap: isDocked && drawerOpen ? 16 : undefined,
          alignItems: "start",
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <CustomerList
            customers={listData.items}
            loading={listQuery.isPending || listQuery.isFetching}
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
            compact={isDocked && drawerOpen}
            profileHref={(id) => customerProfileHref(id, directoryState)}
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
              closeProfile();
              if (size !== pageSize) {
                setPageSize(size);
                setPage(1);
              } else setPage(next);
            }}
            onSelectCustomer={selectCustomer}
            onCreateCustomer={() => {
              setEditingCustomer(null);
              setFormOpen(true);
            }}
          />
        </div>
        {isDocked && drawerOpen ? (
          <aside
            aria-label="Customer profile"
            style={{
              minWidth: 0,
              height: "calc(100vh - 32px)",
              position: "sticky",
              top: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              background: "#fff",
              boxShadow: "0 12px 36px rgba(15,23,42,.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 48,
                padding: "8px 12px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
              }}
            >
              {profileHeader}
            </div>
            <div
              ref={scrollRef}
              style={{
                height: "calc(100% - 48px)",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              {detail}
            </div>
          </aside>
        ) : null}
      </div>
      <Drawer
        title={profileHeader}
        closable={false}
        open={!isDocked && drawerOpen}
        onClose={closeProfile}
        size={screens.md ? "min(620px, calc(100vw - 24px))" : "100vw"}
        styles={{ body: { padding: 0, overflow: "hidden" } }}
      >
        {!isDocked ? (
          <div ref={scrollRef} style={{ height: "100%", overflowY: "auto" }}>
            {detail}
          </div>
        ) : null}
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
