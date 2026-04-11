"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ScanOutlined, HistoryOutlined } from "@ant-design/icons";
import { useSales } from "@/modules/billing/hooks/useBilling";
import { useAppSettings } from "@/modules/settings/hooks/useAppSettings";
import SalesHistory from "@/modules/billing/components/SalesHistory";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { BillingPageTabs, HistoryPane, PageWrapper, PageTitle } from "./billing.styled";
import BillingView from "@/modules/billing/components/BillingView";

const MobileBillingPage = dynamic(() => import("@/modules/mobile-dashboard/pages/BillingPage"));

const BillingPage = () => {
  const [activeTab, setActiveTab] = useState("new-sale");
  const { isMobile, isReady } = useMobileViewport();

  const {
    sales,
    loading: salesLoading,
    filters: salesFilters,
    setFilters: setSalesFilters,
    createSale,
    refundSale,
    getSaleById,
  } = useSales();

  const { settings } = useAppSettings();
  const defaultTaxPct = settings?.billingConfig?.taxRate ?? 0;

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
                  onViewSale={getSaleById}
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

