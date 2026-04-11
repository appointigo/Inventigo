"use client";

import dynamic from "next/dynamic";
import { App, Badge, Button, Empty, Input, Skeleton, Typography } from "antd";
import { CameraOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSales } from "@/modules/billing/hooks/useBilling";
import type { VariantRow } from "@/modules/billing/types";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useStore } from "@/providers/StoreProvider";
import { BillingCart } from "../components/BillingCart";
import { Card } from "../components/Card";
import { PageContainer } from "../components/PageContainer";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";

const CameraBarcodeScannerModal = dynamic(
  () => import("@/modules/barcode/components/CameraBarcodeScannerModal"),
  { ssr: false }
);

export default function BillingPage() {
  const { message } = App.useApp();
  const { storeId } = useStore();
  const { moduleSearch, setModuleSearch, cart } = useMobileWorkspace();
  const { products, loading } = useProducts({ storeId: storeId ?? undefined, search: moduleSearch.billing || undefined });
  const { createSale } = useSales();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
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
    setCheckoutLoading(true);
    try {
      await createSale(cart.toCreateInput());
      cart.clearCart();
      setCartOpen(false);
      message.success("Sale completed");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <PageContainer
        title="Billing"
        subtitle="Fast mobile POS with cart-first checkout"
        headerExtra={
          <Badge count={cart.items.length}>
            <Button icon={<ShoppingCartOutlined />} size="large" shape="round" onClick={() => setCartOpen(true)} />
          </Badge>
        }
        stickySlot={(
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Input
                value={moduleSearch.billing}
                allowClear
                size="large"
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Search product or barcode"
                onChange={(event) => setModuleSearch("billing", event.target.value)}
                onPressEnter={handleScanEnter}
                style={{ minHeight: 48, borderRadius: 18, flex: 1 }}
              />
              {cameraSupported ? (
                <Button
                  size="large"
                  shape="round"
                  icon={<CameraOutlined />}
                  onClick={() => setCameraScanOpen(true)}
                  style={{ minWidth: 52, height: 48 }}
                />
              ) : null}
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
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
          <div style={{ display: "grid", gap: 12 }}>
            {products.map((product) => {
              const sellableSize = product.stock.find((size) => size.quantity > 0) ?? product.stock[0];
              return (
                <Card key={product.id} style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text strong>{product.name}</Typography.Text>
                      <div style={{ marginTop: 6, color: "#64748b" }}>{product.brandName} • {product.categoryName}</div>
                      <div style={{ marginTop: 10, fontWeight: 700 }}>Rs {product.basePrice.toFixed(2)}</div>
                      <div style={{ marginTop: 4, color: sellableSize?.quantity ? "#0f766e" : "#dc2626" }}>
                        {sellableSize ? `${sellableSize.sizeLabel} • ${sellableSize.quantity} in stock` : "No variants"}
                      </div>
                    </div>
                    <Button
                      type="primary"
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

      <div style={{ position: "fixed", left: 16, right: 16, bottom: 118, zIndex: 25, maxWidth: 720, marginInline: "auto" }}>
        <Card style={{ padding: 14, background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Total Amount</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Rs {(cart.subtotal + cart.taxAmount).toFixed(2)}</div>
            </div>
            <Button type="primary" size="large" onClick={() => setCartOpen(true)}>
              Checkout
            </Button>
          </div>
        </Card>
      </div>

      <BillingCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        subtotal={cart.subtotal}
        taxPct={cart.taxPct}
        onTaxChange={cart.setTaxPct}
        paymentMethod={cart.paymentMethod}
        onPaymentMethodChange={cart.setPaymentMethod}
        customerName={cart.customerName}
        onCustomerNameChange={cart.setCustomerName}
        onQuantityChange={cart.updateQuantity}
        onRemove={cart.removeItem}
        onCheckout={() => void handleCheckout()}
        checkoutLoading={checkoutLoading}
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
