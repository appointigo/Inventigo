"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScanOutlined, HistoryOutlined, SwapOutlined } from "@ant-design/icons";
import { useSales } from "@/modules/billing/hooks/useBilling";
import SalesHistory from "@/modules/billing/components/SalesHistory";
import ReturnExchangeView from "@/modules/billing/components/ReturnExchangeView";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { BillingPageTabs, HistoryPane, PageWrapper, PageTitle } from "./billing.styled";
import BillingView from "@/modules/billing/components/BillingView";

const MobileBillingPage = dynamic(() => import("@/modules/mobile-dashboard/pages/BillingPage"));

const DesktopBillingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prefillSaleId, setPrefillSaleId] = useState<string | undefined>(undefined);

  const {
    sales,
    loading: salesLoading,
    filters: salesFilters,
    setFilters: setSalesFilters,
    page,
    setPage,
    pagination,
    stats,
    createSale,
    refundSale,
    collectPayment,
    getSaleById,
    createReturnTransaction,
    refresh,
  } = useSales();

  const defaultTaxPct = 0;
  const requestedView = searchParams.get("view");
  const activeTab = requestedView === "history" || requestedView === "return-exchange" ? requestedView : "new-sale";
  const setActiveTab = (view: string) => {
    router.replace(view === "new-sale" ? "/dashboard/billing" : `/dashboard/billing?view=${view}`);
  };

  return (
    <PageWrapper>
      <BillingPageTabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={{
          left: (
            <PageTitle style={{ marginRight: 20, fontSize: 17, letterSpacing: "-0.2px" }}>
              POS / Billing
            </PageTitle>
          ),
        }}
        items={[
          {
            key: "new-sale",
            label: (
              <span>
                <ScanOutlined /> New Sale
              </span>
            ),
            children: (
              <BillingView createSale={createSale} defaultTaxPct={defaultTaxPct} />
            ),
          },
          {
            key: "history",
            label: (
              <span>
                <HistoryOutlined /> Sales History
              </span>
            ),
            children: (
              <HistoryPane>
                <SalesHistory
                  sales={sales}
                  loading={salesLoading}
                  filters={salesFilters}
                  onFiltersChange={setSalesFilters}
                  onRefund={refundSale}
                  onCollectBalance={collectPayment}
                  onViewSale={getSaleById}
                  onOpenReturnExchange={(saleId: string) => {
                    setPrefillSaleId(saleId);
                    setActiveTab("return-exchange");
                  }}
                  page={page}
                  setPage={setPage}
                  totalPages={pagination?.totalPages}
                  stats={stats}
                />
              </HistoryPane>
            ),
          },
          {
            key: "return-exchange",
            label: (
              <span>
                <SwapOutlined /> Return / Exchange
              </span>
            ),
            children: (
              <HistoryPane>
                <ReturnExchangeView
                  sales={sales}
                  loading={salesLoading}
                  onFetchSale={getSaleById}
                  onCreateReturnTransaction={createReturnTransaction}
                  refreshSales={refresh}
                  initialSaleId={prefillSaleId}
                />
              </HistoryPane>
            ),
          },
        ]}
      />
    </PageWrapper>
  );
};

const BillingPage = () => {
  const { isMobile, isReady } = useMobileViewport();

  if (!isReady) {
    return null;
  }

  return isMobile ? <MobileBillingPage /> : <DesktopBillingPage />;
};

export default BillingPage;
