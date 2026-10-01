"use client";

import { FilterOutlined, SearchOutlined, SwapOutlined } from "@ant-design/icons";
import { Badge, Button, Drawer, Empty, Input, Select, Skeleton, Tag } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { PaymentMethodType, Sale, SaleFilters } from "@/modules/billing/types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { Card } from "./Card";
import { MobileSaleDetails } from "./MobileSaleDetails";
import styles from "./MobileSalesHistory.module.css";

type HistoryRow = {
  id: string;
  rowType?: "SALE" | "RETURN_TRANSACTION";
  type?: "RETURN" | "EXCHANGE" | "RETURN_EXCHANGE";
  originalSaleId?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  saleInvoiceNumber?: string;
  customerName?: string | null;
  total?: number;
  netAmount?: number;
  refundAmount?: number;
  amountPaid?: number;
  amountDue?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  itemCount?: number;
  transactionDate?: string;
  businessDate?: string;
  createdAt: string;
};

type Props = {
  sales: HistoryRow[];
  loading: boolean;
  error?: string | null;
  filters: SaleFilters;
  onFiltersChange: (filters: SaleFilters) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewSale: (saleId: string) => Promise<Sale | null>;
  onCollectPayment: (
    saleId: string,
    amount: number,
    method: PaymentMethodType,
    splitPayments?: Array<{ method: PaymentMethodType; amount: number }>,
    note?: string
  ) => Promise<unknown>;
  onOpenExchange: (saleId: string) => void;
};

export function MobileSalesHistory({
  sales,
  loading,
  error,
  filters,
  onFiltersChange,
  page,
  totalPages,
  onPageChange,
  onViewSale,
  onCollectPayment,
  onOpenExchange,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [eligibilityReferenceTime] = useState(() => Date.now());
  const activeFilterCount = useMemo(
    () => [filters.status, filters.paymentMethod, filters.type].filter(Boolean).length,
    [filters]
  );

  const loadSale = async (saleId: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    const sale = await onViewSale(saleId);
    setSelectedSale(sale);
    setDetailLoading(false);
  };

  return (
    <>
      <div className={styles.toolbar}>
        <Input
          allowClear
          size="large"
          value={filters.search ?? ""}
          prefix={<SearchOutlined />}
          placeholder="Invoice or customer"
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value || undefined })}
        />
        <Badge count={activeFilterCount} size="small">
          <Button aria-label="Filter transactions" size="large" icon={<FilterOutlined />} onClick={() => setFilterOpen(true)} />
        </Badge>
      </div>

      <div className={styles.typeTabs} role="tablist" aria-label="Transaction type">
        {["ALL", "SALE", "EXCHANGE", "RETURN"].map((type) => {
          const active = (filters.type ?? "ALL") === type;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? styles.activeType : undefined}
              onClick={() => onFiltersChange({ ...filters, type: type === "ALL" ? undefined : type as SaleFilters["type"] })}
            >
              {type === "ALL" ? "All" : type === "SALE" ? "Sales" : type === "EXCHANGE" ? "Exchanges" : "Returns"}
            </button>
          );
        })}
      </div>

      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : error ? (
        <Card><div className={styles.error}>{error}</div></Card>
      ) : sales.length === 0 ? (
        <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions found" /></Card>
      ) : (
        <div className={styles.list}>
          {sales.map((row) => {
            const isSale = (row.rowType ?? "SALE") === "SALE";
            const saleId = isSale ? row.id : row.originalSaleId;
            const amount = isSale ? Number(row.total ?? 0) : Number(row.netAmount ?? 0) - Number(row.refundAmount ?? 0);
            const title = isSale ? row.invoiceNumber : row.referenceNumber;
            const date = row.businessDate ?? row.transactionDate ?? row.createdAt;
            return (
              <Card key={`${row.rowType ?? "SALE"}-${row.id}`} style={{ padding: 0 }}>
                <button className={styles.cardButton} type="button" onClick={() => saleId && void loadSale(saleId)}>
                  <div className={styles.cardTop}>
                    <div className={styles.identity}>
                      <strong>{title ? `#${title}` : "Transaction"}</strong>
                      <span>{row.customerName || "Walk-in customer"}</span>
                    </div>
                    <div className={styles.amount}>{amount < 0 ? "−" : ""}{formatCurrency(Math.abs(amount))}</div>
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{dayjs(date).format("DD MMM YYYY · h:mm A")}</span>
                    <span>{isSale ? `${row.itemCount ?? 0} items` : row.saleInvoiceNumber ? `Invoice ${row.saleInvoiceNumber}` : "Return / exchange"}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <Tag color={!isSale ? "purple" : row.paymentStatus === "PAID" ? "green" : row.paymentStatus === "PARTIAL" ? "orange" : "red"}>
                      {!isSale ? row.type?.replace("_", " /") : row.paymentStatus}
                    </Tag>
                    {isSale && Number(row.amountDue ?? 0) > 0 ? <span className={styles.due}>{formatCurrency(row.amountDue ?? 0)} due</span> : <span>{row.paymentMethod}</span>}
                  </div>
                </button>
                {isSale && row.status === "COMPLETED" && eligibilityReferenceTime - new Date(row.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000 ? (
                  <Button className={styles.exchangeButton} type="text" icon={<SwapOutlined />} onClick={() => onOpenExchange(row.id)}>
                    Return / exchange
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className={styles.pagination}>
          <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
          <span>Page {page} of {totalPages}</span>
          <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      ) : null}

      <Drawer
        open={filterOpen}
        placement="bottom"
        height="auto"
        title="Filter transactions"
        onClose={() => setFilterOpen(false)}
        className={styles.filterDrawer}
      >
        <div className={styles.filters}>
          <label>Status<Select allowClear value={filters.status} placeholder="All statuses" onChange={(status) => onFiltersChange({ ...filters, status })} options={[{ value: "COMPLETED", label: "Completed" }, { value: "PENDING", label: "Pending" }, { value: "REFUNDED", label: "Refunded" }, { value: "EXCHANGED", label: "Exchanged" }]} /></label>
          <label>Payment<Select allowClear value={filters.paymentMethod} placeholder="All methods" onChange={(paymentMethod) => onFiltersChange({ ...filters, paymentMethod })} options={[{ value: "CASH", label: "Cash" }, { value: "CARD", label: "Card" }, { value: "UPI", label: "UPI" }]} /></label>
          <Button onClick={() => onFiltersChange({ search: filters.search })}>Clear filters</Button>
          <Button type="primary" onClick={() => setFilterOpen(false)}>Show results</Button>
        </div>
      </Drawer>

      <MobileSaleDetails
        open={detailOpen}
        loading={detailLoading}
        sale={selectedSale}
        onClose={() => { setDetailOpen(false); setSelectedSale(null); }}
        onOpenExchange={(saleId) => { setDetailOpen(false); onOpenExchange(saleId); }}
        onCollectPayment={onCollectPayment}
        onReload={async (saleId) => {
          const sale = await onViewSale(saleId);
          setSelectedSale(sale);
        }}
      />
    </>
  );
}
