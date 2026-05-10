"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ScanOutlined, HistoryOutlined, SwapOutlined } from "@ant-design/icons";
import { useSales } from "@/modules/billing/hooks/useBilling";
import SalesHistory from "@/modules/billing/components/SalesHistory";
import ReturnExchangeView from "@/modules/billing/components/ReturnExchangeView";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { BillingPageTabs, HistoryPane, PageWrapper, PageTitle } from "./billing.styled";
import BillingView from "@/modules/billing/components/BillingView";

const MobileBillingPage = dynamic(() => import("@/modules/mobile-dashboard/pages/BillingPage"));

const BillingPage = () => {
  const [activeTab, setActiveTab] = useState("new-sale");
  const [prefillSaleId, setPrefillSaleId] = useState<string | undefined>(undefined);
  const { isMobile, isReady } = useMobileViewport();

  const {
    sales,
    loading: salesLoading,
    filters: salesFilters,
    setFilters: setSalesFilters,
    createSale,
    refundSale,
    collectPayment,
    getSaleById,
    createReturnTransaction,
    refresh,
  } = useSales();

  const defaultTaxPct = 0;

  if (!isReady) {
    return null;
  }

  if (isMobile) {
    return <MobileBillingPage />;
  }

  return (
    <PageWrapper>
      <BillingPageTabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={{
          left: (
            <PageTitle style={{ marginRight: 20, fontSize: 17, letterSpacing: "-0.2px" }}>
              Billing
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

export default BillingPage;

