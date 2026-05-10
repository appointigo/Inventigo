"use client";

import { useState } from "react";
import { Tag, Button, Space, Input, Select, DatePicker, Popconfirm, App, Typography, Card, Modal, Divider } from "antd";
import { EyeOutlined, RollbackOutlined, SearchOutlined, FileTextOutlined, SwapOutlined, ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import type { SaleSummary, Sale, SaleFilters, PaymentMethodType, SaleStatusType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";
import InvoicePreview from "./InvoicePreview";
import TransactionCard from "./TransactionCard";
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
    } 
    else {
      message.error("Failed to load sale details");
    }
  };

  const handleViewReturn = async (rt: any) => {
    // unified data already contains items — open local preview
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Billing & Order History</Typography.Title>
        </div>
        <div style={{ flex: 1, margin: "0 16px" }}>
          <FilterBar filters={filters} onChange={onFiltersChange} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Button icon={<PrinterOutlined />} />
          <Button icon={<QuestionCircleOutlined />} />
        </div>
      </div>

      <StatsStrip sales={sales} kpis={stats} />

      <TabStrip active={(filters as any).type ?? "ALL"} onChange={(k) => onFiltersChange({ ...filters, type: k === "ALL" ? undefined : (k as any) })} />

      <div>
        {loading && <div style={{ color: "#6b7280" }}>Loading...</div>}

        {(!loading && sales.length === 0) && <Card>No transactions found.</Card>}

        <div>
          {sales.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((rec: any) => (
            <TransactionCard
              key={rec.id}
              record={rec}
              onViewSale={async (id) => {
                const sale = await onViewSale(id);
                if (sale) {
                  setPreviewSale(sale);
                  setPreviewOpen(true);
                }
              }}
              onViewReturn={(rt) => {
                setPreviewReturn(rt);
                setPreviewReturnOpen(true);
              }}
              onCollectBalance={onCollectBalance}
              onOpenReturnExchange={onOpenReturnExchange}
            />
          ))}
        </div>

        <PaginationBar page={currentPage} totalPages={typeof totalPages === "number" ? totalPages : Math.max(1, Math.ceil((sales?.length ?? 0) / pageSize))} onChange={(p) => changePage(p)} />
      </div>

      <InvoicePreview
        sale={previewSale}
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewSale(null);
        }}
      />
    </>
  );
}
