"use client";

import dynamic from "next/dynamic";
import { App, Badge, Button, Empty, Input, Skeleton, Typography } from "antd";
import { CameraOutlined, HistoryOutlined, ScanOutlined, SearchOutlined, ShoppingCartOutlined, SwapOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSaleRequest, useSales } from "@/modules/billing/hooks/useBilling";
import type { VariantRow } from "@/modules/billing/types";
import ReturnExchangeView from "@/modules/billing/components/ReturnExchangeView";
import { getInvoiceDeliveryFeedback } from "@/modules/billing/utils/invoiceDeliveryFeedback";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useStore } from "@/providers/StoreProvider";
import { BillingCart } from "../components/BillingCart";
import { Card } from "../components/Card";
import { MobileSalesHistory } from "../components/MobileSalesHistory";
import { PageContainer } from "../components/PageContainer";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./BillingPage.module.css";

const CameraBarcodeScannerModal = dynamic(
  () => import("@/modules/barcode/components/CameraBarcodeScannerModal"),
  { ssr: false }
);

export default function BillingPage() {
  const { message } = App.useApp();
  const { storeId } = useStore();
  const { moduleSearch, setModuleSearch, cart } = useMobileWorkspace();
  const { products, loading } = useProducts({ storeId: storeId ?? undefined, search: moduleSearch.billing || undefined });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerStats, setCustomerStats] = useState<{
    totalVisits: number;
    totalSpend: number;
    lastPurchaseDate: string | null;
  } | null>(null);
  const pendingCameraScanRef = useRef<string | null>(null);
  const [activeView, setActiveView] = useState<"sale" | "history" | "exchange">("sale");
  const [exchangeSaleId, setExchangeSaleId] = useState<string | undefined>();
  const salesState = useSales();

  const openExchange = useCallback((saleId?: string) => {
    setExchangeSaleId(saleId);
    setActiveView("exchange");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const mobileTabs = (
    <div className={styles.mobileTabs} role="tablist" aria-label="Billing sections">
      <button type="button" role="tab" aria-selected={activeView === "sale"} className={activeView === "sale" ? styles.activeTab : undefined} onClick={() => setActiveView("sale")}>
        <ScanOutlined /> <span>Sale</span>
      </button>
      <button type="button" role="tab" aria-selected={activeView === "history"} className={activeView === "history" ? styles.activeTab : undefined} onClick={() => setActiveView("history")}>
        <HistoryOutlined /> <span>History</span>
      </button>
      <button type="button" role="tab" aria-selected={activeView === "exchange"} className={activeView === "exchange" ? styles.activeTab : undefined} onClick={() => openExchange()}>
        <SwapOutlined /> <span>Exchange</span>
      </button>
    </div>
  );

  useEffect(() => {
    if (
      typeof window !== "undefined"
      && typeof navigator !== "undefined"
      && !!navigator.mediaDevices?.getUserMedia
    ) {
      setCameraSupported(true);
    }
  }, []);

  const variantRows = useMemo((): VariantRow[] => products.flatMap((product) =>
    product.stock.map((size) => ({
      rowKey: `${product.id}-${size.sizeId}`,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      sku: product.sku,
      externalBarcode: product.externalBarcode ?? null,
      variantSku: size.variantSku ?? null,
      brandName: product.brandName,
      categoryName: product.categoryName,
      basePrice: product.basePrice,
      isActive: product.isActive,
      attributes: product.attributes,
      sizeId: size.sizeId,
      sizeLabel: size.sizeLabel,
      stockQty: size.quantity,
    }))
  ), [products]);

  const addVariantToCart = useCallback((row: VariantRow) => {
    if (row.stockQty <= 0 || !row.isActive) {
      message.error("This item cannot be added right now");
      return;
    }
    cart.addItem({
      productId: row.productId,
      productName: row.productName,
      imageUrl: row.imageUrl,
      sku: row.sku,
      sizeId: row.sizeId,
      sizeLabel: row.sizeLabel,
      attributes: row.attributes,
      quantity: 1,
      unitPrice: row.basePrice,
    });
    message.success(`${row.productName} · ${row.sizeLabel} added`);
  }, [cart, message]);

  const handleCameraScan = useCallback((decodedText: string) => {
    pendingCameraScanRef.current = decodedText;
    setModuleSearch("billing", decodedText);
    setCameraScanOpen(false);
  }, [setModuleSearch]);

  useEffect(() => {
    const pending = pendingCameraScanRef.current;
    if (!pending || loading) {
      return;
    }

    const normalized = pending.toLowerCase().trim();
    const exactMatches = variantRows.filter(
      (row) => row.variantSku?.toLowerCase() === normalized || row.externalBarcode?.toLowerCase() === normalized
    );

    if (exactMatches.length === 1) {
      pendingCameraScanRef.current = null;
      addVariantToCart(exactMatches[0]);
      setModuleSearch("billing", "");
    }
  }, [addVariantToCart, loading, setModuleSearch, variantRows]);

  const handleScanEnter = useCallback(() => {
    const normalized = moduleSearch.billing.trim().toLowerCase();
    if (!normalized || loading) {
      return;
    }

    const exactMatch = variantRows.find(
      (row) => row.variantSku?.toLowerCase() === normalized || row.externalBarcode?.toLowerCase() === normalized
    );

    if (exactMatch) {
      addVariantToCart(exactMatch);
      setModuleSearch("billing", "");
    }
  }, [addVariantToCart, loading, moduleSearch.billing, setModuleSearch, variantRows]);

  const handleCheckout = async () => {
    if (!cart.customerPhone || cart.customerPhone.length < 10) {
      message.error("Select a customer to continue");
      return;
    }

    setCheckoutLoading(true);
    try {
      const sale = await createSaleRequest(cart.toCreateInput());
      cart.clearCart();
      setCartOpen(false);
      const feedback = getInvoiceDeliveryFeedback("Sale", sale.invoiceDelivery);
      message[feedback.level](feedback.text);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    if (cart.customerPhone.length !== 10) {
      setCustomerStats(null);
      setCustomerLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCustomerLoading(true);

      try {
        const statsRes = await fetch(`/api/customers/by-mobile/${encodeURIComponent(cart.customerPhone)}/stats`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!statsRes.ok) {
          setCustomerStats({ totalVisits: 0, totalSpend: 0, lastPurchaseDate: null });
          return;
        }

        const stats = await statsRes.json() as {
          totalVisits: number;
          totalSpend: number;
          lastPurchaseDate: string | null;
        };
        setCustomerStats(stats);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setCustomerStats(null);
        message.error(error instanceof Error ? error.message : "Failed to fetch customer details");
      } finally {
        if (!controller.signal.aborted) setCustomerLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cart.customerPhone, message]);

  if (activeView === "history") {
    return (
      <PageContainer
        title="Sales history"
        subtitle="Find sales, payments and exchanges"
        stickySlot={mobileTabs}
      >
        <MobileSalesHistory
          sales={salesState.sales}
          loading={salesState.loading}
          error={salesState.error}
          filters={salesState.filters}
          onFiltersChange={(filters) => { salesState.setPage(1); salesState.setFilters(filters); }}
          page={salesState.page}
          totalPages={salesState.pagination.totalPages}
          onPageChange={salesState.setPage}
          onViewSale={salesState.getSaleById}
          onCollectPayment={salesState.collectPayment}
          onOpenExchange={openExchange}
        />
      </PageContainer>
    );
  }

  if (activeView === "exchange") {
    return (
      <PageContainer
        title="Return / exchange"
        subtitle="Select an eligible completed sale"
        stickySlot={mobileTabs}
      >
        <ReturnExchangeView
          mobile
          sales={salesState.sales}
          loading={salesState.loading}
          onFetchSale={salesState.getSaleById}
          onCreateReturnTransaction={salesState.createReturnTransaction}
          refreshSales={salesState.refresh}
          initialSaleId={exchangeSaleId}
        />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        title="Billing"
        subtitle="Fast mobile POS with cart-first checkout"
        style={{ paddingBottom: "calc(238px + env(safe-area-inset-bottom))" }}
        headerExtra={
          <Badge count={cart.items.length}>
            <Button icon={<ShoppingCartOutlined />} size="large" shape="round" onClick={() => setCartOpen(true)} />
          </Badge>
        }
        stickySlot={(
          <div className={styles.stickyContent}>
            {mobileTabs}
            <div className={styles.searchPanel}>
            <div className={styles.searchRow}>
              <Input
                value={moduleSearch.billing}
                allowClear
                size="large"
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Search product or barcode"
                onChange={(event) => setModuleSearch("billing", event.target.value)}
                onPressEnter={handleScanEnter}
                className={styles.searchInput}
              />
              {cameraSupported ? (
                <Button
                  size="large"
                  shape="round"
                  icon={<CameraOutlined />}
                  onClick={() => setCameraScanOpen(true)}
                  className={styles.scanButton}
                />
              ) : null}
            </div>
            <Typography.Text type="secondary" className={styles.scanHint}>
              Barcode scanners can type here and auto-add on Enter. Camera scan is available on supported devices.
            </Typography.Text>
            </div>
          </div>
        )}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : variantRows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sellable products found" />
        ) : (
          <div className={styles.productList}>
            {variantRows.map((row) => (
                <Card key={row.rowKey} style={{ padding: 13 }}>
                  <div className={styles.productRow}>
                    <div className={styles.productDetails}>
                      <Typography.Text strong className={styles.productName}>{row.productName}</Typography.Text>
                      <div className={styles.productMeta}>{row.brandName} • {row.categoryName}</div>
                      <div className={styles.productPrice}>{formatCurrency(row.basePrice)}</div>
                      <div className={row.stockQty > 0 ? styles.inStock : styles.outOfStock}>
                        {row.sizeLabel} • {row.stockQty} in stock
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      className={styles.addButton}
                      disabled={row.stockQty <= 0 || !row.isActive}
                      onClick={() => addVariantToCart(row)}
                    >
                      Add
                    </Button>
                  </div>
                </Card>
            ))}
          </div>
        )}
      </PageContainer>

      <div className={styles.checkoutDock}>
        <Card style={{ padding: 14, background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "#fff", border: 0 }}>
          <div className={styles.checkoutRow}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Total Amount</div>
              <div className={styles.total}>{formatCurrency(cart.total)}</div>
            </div>
            <Button type="primary" size="large" className={styles.checkoutButton} onClick={() => setCartOpen(true)}>
              Cart & checkout
            </Button>
          </div>
        </Card>
      </div>

      <BillingCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        onItemPricingChange={cart.updateItemPricing}
        subtotal={cart.subtotal}
        taxPct={cart.taxPct}
        onTaxChange={cart.setTaxPct}
        paymentMethod={cart.paymentMethod}
        onPaymentMethodChange={cart.setPaymentMethod}
        splitMode={cart.splitMode}
        onSplitModeChange={cart.setSplitMode}
        splitPayments={cart.splitPayments}
        onSplitPaymentsChange={cart.setSplitPayments}
        customerName={cart.customerName}
        onCustomerNameChange={cart.setCustomerName}
        customerPhone={cart.customerPhone}
        onCustomerPhoneChange={cart.setCustomerPhone}
        onCustomerEmailChange={cart.setCustomerEmail}
        customerStats={customerStats}
        customerLoading={customerLoading}
        onQuantityChange={cart.updateQuantity}
        onRemove={cart.removeItem}
        onCheckout={() => void handleCheckout()}
        checkoutLoading={checkoutLoading}
        transactionDate={cart.transactionDate}
        onTransactionDateChange={cart.setTransactionDate}
      />

      {cameraScanOpen ? (
        <CameraBarcodeScannerModal
          open={cameraScanOpen}
          onScan={handleCameraScan}
          onClose={() => setCameraScanOpen(false)}
        />
      ) : null}
    </>
  );
}
