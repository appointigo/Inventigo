"use client";

import dynamic from "next/dynamic";
import { App, Badge, Button, Empty, Input, Skeleton, Typography } from "antd";
import { CameraOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSaleRequest } from "@/modules/billing/hooks/useBilling";
import type { VariantRow, WhatsAppInvoiceSelection } from "@/modules/billing/types";
import { getInvoiceDeliveryFeedback } from "@/modules/billing/utils/invoiceDeliveryFeedback";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useStore } from "@/providers/StoreProvider";
import { BillingCart } from "../components/BillingCart";
import { Card } from "../components/Card";
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
  const [whatsappInvoice, setWhatsAppInvoice] = useState<WhatsAppInvoiceSelection>({ enabled: false });
  const pendingCameraScanRef = useRef<string | null>(null);

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

  const addToCart = useCallback((productId: string, productName: string, sku: string, sizeId: string, sizeLabel: string, unitPrice: number) => {
    cart.addItem({ productId, productName, sku, sizeId, sizeLabel, attributes: {}, quantity: 1, unitPrice });
    setCartOpen(true);
  }, [cart]);

  const addVariantToCart = useCallback((row: VariantRow) => {
    if (row.stockQty <= 0 || !row.isActive) {
      message.error("This item cannot be added right now");
      return;
    }
    addToCart(row.productId, row.productName, row.sku, row.sizeId, row.sizeLabel, row.basePrice);
  }, [addToCart, message]);

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
      message.error("Enter customer mobile number to continue");
      return;
    }

    setCheckoutLoading(true);
    try {
      const sale = await createSaleRequest({ ...cart.toCreateInput(), whatsappInvoice });
      cart.clearCart();
      setWhatsAppInvoice({ enabled: false });
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

    const timer = setTimeout(async () => {
      setCustomerLoading(true);

      try {
        const customerRes = await fetch("/api/customer/get-or-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobile: cart.customerPhone,
            name: cart.customerName || undefined,
            email: cart.customerEmail || undefined,
          }),
        });

        if (!customerRes.ok) {
          const payload = await customerRes.json().catch(() => ({ error: "Failed to fetch customer" }));

          // For new numbers, allow user to type name first without noisy errors.
          if (
            customerRes.status === 400
            && typeof payload?.error === "string"
            && payload.error.toLowerCase().includes("name")
          ) {
            setCustomerStats(null);
            return;
          }

          throw new Error(payload?.error || "Failed to fetch customer");
        }

        const customer = await customerRes.json() as {
          name: string;
          mobile: string;
          email: string | null;
        };

        if (customer.name && customer.name !== cart.customerName) {
          cart.setCustomerName(customer.name);
        }
        if (customer.email && customer.email !== cart.customerEmail) {
          cart.setCustomerEmail(customer.email);
        }

        const statsRes = await fetch(`/api/customers/${encodeURIComponent(customer.mobile)}/stats`);
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
        setCustomerStats(null);
        message.error(error instanceof Error ? error.message : "Failed to fetch customer details");
      } finally {
        setCustomerLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    cart.customerPhone,
    cart.customerName,
    cart.customerEmail,
    cart.setCustomerName,
    cart.setCustomerEmail,
    message,
  ]);

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
        )}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : products.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sellable products found" />
        ) : (
          <div className={styles.productList}>
            {products.map((product) => {
              const sellableSize = product.stock.find((size) => size.quantity > 0) ?? product.stock[0];
              return (
                <Card key={product.id} style={{ padding: 13 }}>
                  <div className={styles.productRow}>
                    <div className={styles.productDetails}>
                      <Typography.Text strong className={styles.productName}>{product.name}</Typography.Text>
                      <div className={styles.productMeta}>{product.brandName} • {product.categoryName}</div>
                      <div className={styles.productPrice}>{formatCurrency(product.basePrice)}</div>
                      <div className={sellableSize?.quantity ? styles.inStock : styles.outOfStock}>
                        {sellableSize ? `${sellableSize.sizeLabel} • ${sellableSize.quantity} in stock` : "No variants"}
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      className={styles.addButton}
                      disabled={!sellableSize || sellableSize.quantity <= 0}
                      onClick={() => sellableSize && addToCart(product.id, product.name, product.sku, sellableSize.sizeId, sellableSize.sizeLabel, product.basePrice)}
                    >
                      Add
                    </Button>
                  </div>
                </Card>
              );
            })}
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
        customerEmail={cart.customerEmail}
        onCustomerEmailChange={cart.setCustomerEmail}
        customerStats={customerStats}
        customerLoading={customerLoading}
        onQuantityChange={cart.updateQuantity}
        onRemove={cart.removeItem}
        onCheckout={() => void handleCheckout()}
        checkoutLoading={checkoutLoading}
        transactionDate={cart.transactionDate}
        onTransactionDateChange={cart.setTransactionDate}
        storeId={storeId}
        whatsappInvoice={whatsappInvoice}
        onWhatsAppInvoiceChange={setWhatsAppInvoice}
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
