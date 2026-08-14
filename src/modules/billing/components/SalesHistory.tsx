"use client";

import { useState } from "react";
import { Tag, Button, Space, Input, Select, DatePicker, Popconfirm, App, Typography, Card, Modal, Divider } from "antd";
import { EyeOutlined, RollbackOutlined, SearchOutlined, FileTextOutlined, SwapOutlined, ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import type { SaleSummary, Sale, SaleFilters, PaymentMethodType, SaleStatusType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";
import InvoicePreview from "./InvoicePreview";
import OrdersTable from "./OrdersTable";
import StatsStrip from "./StatsStrip";
import FilterBar from "./FilterBar";
import TabStrip from "./TabStrip";
import PaginationBar from "./PaginationBar";

const { RangePicker } = DatePicker;

interface SalesHistoryProps {
  sales: any[]; // unified rows: SALE | RETURN_TRANSACTION
  loading: boolean;
  filters: SaleFilters;
  onFiltersChange: (filters: SaleFilters) => void;
  onRefund: (saleId: string) => Promise<void>;
  onCollectBalance: (saleId: string, amount: number, paymentMethod: PaymentMethodType) => Promise<void>;
  onViewSale: (saleId: string) => Promise<Sale | null>;
  onOpenReturnExchange?: (saleId: string) => void;
  page?: number;
  setPage?: (p: number) => void;
  totalPages?: number;
  stats?: any;
}

export default function SalesHistory({
  sales,
  loading,
  filters,
  onFiltersChange,
  onRefund,
  onCollectBalance,
  onViewSale,
  onOpenReturnExchange,
  page,
  setPage,
  totalPages,
  stats,
}: SalesHistoryProps) {
  const { message } = App.useApp();
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReturn, setPreviewReturn] = useState<any | null>(null);
  const [previewReturnOpen, setPreviewReturnOpen] = useState(false);
  const [localPage, setLocalPage] = useState(1);
  const pageSize = 10;
  const currentPage = typeof page !== "undefined" ? page : localPage;
  const changePage = (p: number) => {
    if (typeof setPage === "function") setPage(p);
    else setLocalPage(p);
  };

  const handleView = async (saleId: string) => {
    const sale = await onViewSale(saleId);
    if (sale) {
      setPreviewSale(sale);
      setPreviewOpen(true);
    } else {
      message.error("Failed to load sale details");
    }
  };

  const handleViewReturn = async (rt: any) => {
    setPreviewReturn(rt);
    setPreviewReturnOpen(true);
  };

  const handleCollectBalance = async (saleId: string, amount: number, paymentMethod: PaymentMethodType) => {
    try {
      await onCollectBalance(saleId, amount, paymentMethod);
      message.success("Balance collected successfully");
    } catch (error) {
      message.error("Failed to collect remaining balance");
    }
  };

  const handleRefund = async (saleId: string) => {
    await onRefund(saleId);
    message.success("Sale refunded successfully");
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>Sales History</Typography.Title>
            <Typography.Text type="secondary">View and manage all your billing and order transactions</Typography.Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button icon={<PrinterOutlined />} />
            <Button icon={<QuestionCircleOutlined />} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <FilterBar filters={filters} onChange={onFiltersChange} />
        </div>
      </div>

      <StatsStrip sales={sales} kpis={stats} />

      <TabStrip active={(filters as any).type ?? "ALL"} onChange={(k) => onFiltersChange({ ...filters, type: k === "ALL" ? undefined : (k as any) })} />

      <div>
        {loading && <div style={{ color: "#6b7280" }}>Loading...</div>}

        {(!loading && sales.length === 0) && <Card>No transactions found.</Card>}

        <div>
          <OrdersTable
            sales={sales}
            loading={loading}
            onViewSale={async (id: string) => {
              const sale = await onViewSale(id);
              if (sale) {
                setPreviewSale(sale);
                setPreviewOpen(true);
              }
            }}
            onViewReturn={(rt: any) => {
              setPreviewReturn(rt);
              setPreviewReturnOpen(true);
            }}
            onCollectBalance={onCollectBalance}
            onOpenReturnExchange={onOpenReturnExchange}
          />

          <PaginationBar page={currentPage} totalPages={typeof totalPages === "number" ? totalPages : Math.max(1, Math.ceil((sales?.length ?? 0) / pageSize))} onChange={(p) => changePage(p)} />
        </div>
      </div>

      <InvoicePreview
        sale={previewSale}
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewSale(null);
        }}
      />

      {previewReturnOpen && (
        <Modal open={previewReturnOpen} onCancel={() => setPreviewReturnOpen(false)} footer={null} title="Return / Exchange Preview">
          <div>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(previewReturn, null, 2)}</pre>
          </div>
        </Modal>
      )}
    </>
  );
}
