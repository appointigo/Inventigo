"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { App, Input, Select, Spin } from "antd";
import { SearchOutlined, CheckOutlined, CloseOutlined, TagOutlined, LockOutlined, CameraOutlined } from "@ant-design/icons";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useCart } from "@/modules/billing/hooks/useBilling";
import { sanitizeScannedBarcode } from "@/shared/services/barcodeService";
import InvoicePreview from "./InvoicePreview";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { VariantRow, CreateSaleInput, Sale, PaymentMethodType } from "@/modules/billing/types";
import { PAYMENT_OPTIONS } from "@/modules/billing/constants";
import { usePromoCodes } from "@/modules/promo-codes/hooks/usePromoCodes";
import type { PromoCode } from "@/modules/promo-codes/types";
import { GRADIENTS } from "@/modules/promo-codes/components/PromoCodesSettings.styled";
import { OfferOptionRow, OfferBadge, OfferOptionInfo, OfferOptionTitle, OfferOptionDesc } from "./CartPanel.styled";
import {
  ViewAWrapper,
  ScanProductPane,
  CheckoutPane,
  ScanHeroBox,
  ScanHeroLabelRow,
  ScanBlinker,
  ScanHeroLabelText,
  ScanHeroInput,
  ScanHeroHint,
  KbdKey,
  ScanFlash,
  ScanFlashInfo,
  ScanFlashName,
  ScanFlashMeta,
  ScanFlashSku,
  ScanFlashSize,
  ScanFlashPrice,
  ScanAddedBadge,
  ResultsBox,
  ResultsBoxHeader,
  ResultsBoxTitle,
  ResultsCountBadge,
  ResultsScrollBody,
  ResultRow,
  ResultProductCol,
  ResultProductName,
  ResultProductBrand,
  ResultSkuPill,
  ResultSizeBadge,
  ResultStockText,
  ResultPriceText,
  CartSectionWrap,
  CartListHeader,
  CartListTitle,
  ClearAllBtn,
  CartRows,
  CartRowItem,
  RowNumber,
  RowInfoWrap,
  RowProductName,
  RowMetaLine,
  RowSkuPill,
  RowSizePill,
  RowAttrPill,
  RowQtyCtrl,
  RowQtyBtn,
  RowQtyVal,
  RowTotal,
  RowDelBtn,
  CartEmptyState,
  CartEmptyIcon,
  CartEmptyText,
  CheckoutHeader,
  CheckoutHeaderTitle,
  CheckoutItemCount,
  CheckoutScrollBody,
  CheckoutSection,
  CheckoutSectionLabel,
  CustomerGrid,
  CustomerField,
  CustomerFieldFull,
  FieldLabel,
  RequiredStar,
  CustWarning,
  PayPillsGrid,
  APayPill,
  PayPillEmoji,
  APromoRow,
  APromoInput,
  APromoApplyBtn,
  APromoSuccessPill,
  APromoClearBtn,
  SummaryCardWrap,
  ASumRow,
  ASumPctGroup,
  ASumPctInput,
  ATotalRow,
  CheckoutFooter,
  ConfirmHint,
  SecureText,
} from "./BillingView.styled";
import { Button } from "antd";
import { ScanHeroInputRow, CameraScanBtn } from "./BillingView.styled";

// Dynamic import — camera modal must only run client-side (uses getUserMedia)
const CameraBarcodeScannerModal = dynamic(
  () => import("@/modules/barcode/components/CameraBarcodeScannerModal"),
  { ssr: false }
);

interface BillingViewProps {
  createSale: (input: CreateSaleInput) => Promise<Sale>;
  defaultTaxPct?: number;
}

const BillingView = ({ createSale, defaultTaxPct = 0 }: BillingViewProps) => {
  const { message } = App.useApp();

  // ─── Local UI state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [lastAdded, setLastAdded] = useState<VariantRow | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // ─── Camera scanner state ─────────────────────────────────────────────────
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);

  // Detect camera support once on mount (client-only)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia
    ) {
      setCameraSupported(true);
    }
  }, []);

  // ─── Promo state ───────────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState("");

  // ─── Cart + products ───────────────────────────────────────────────────────
  const cart = useCart();
  const { promos } = usePromoCodes();
  const { products, loading: productsLoading } = useProducts(
    search.trim() ? { search: search.trim() } : undefined
  );

  // Auto-apply default tax rate on first load
  useEffect(() => {
    if (defaultTaxPct > 0 && cart.taxPct === 0) {
      cart.setTaxPct(defaultTaxPct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTaxPct]);

  // ─── Variant rows (flatten products → one row per SKU variant) ─────────────
  const variantRows = useMemo((): VariantRow[] => {
    const rows: VariantRow[] = products.flatMap((p) =>
      p.stock.map((s) => ({
        rowKey: `${p.id}-${s.sizeId}`,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        externalBarcode: p.externalBarcode ?? null,
        variantSku: s.variantSku ?? null,
        brandName: p.brandName,
        categoryName: p.categoryName,
        basePrice: p.basePrice,
        isActive: p.isActive,
        attributes: p.attributes,
        sizeId: s.sizeId,
        sizeLabel: s.sizeLabel,
        stockQty: s.quantity,
      }))
    );

    if (search.trim()) {
      const s = search.toLowerCase().trim();
      const exactMatches = rows.filter(
        (r) => r.variantSku?.toLowerCase() === s || r.externalBarcode?.toLowerCase() === s
      );
      if (exactMatches.length === 1) return exactMatches;
      if (exactMatches.length > 1) return exactMatches;

      return rows.filter(
        (r) =>
          r.variantSku?.toLowerCase().includes(s) ||
          r.productName.toLowerCase().includes(s) ||
          r.sku.toLowerCase().includes(s) ||
          r.externalBarcode?.toLowerCase().includes(s)
      );
    }

    return rows;
  }, [products, search]);

  // ─── Cart actions ──────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    (row: VariantRow) => {
      if (row.stockQty <= 0) {
        message.error("This variant is out of stock");
        return;
      }

      const existing = cart.items.find(
        (i) => i.productId === row.productId && i.sizeId === row.sizeId
      );

      if ((existing?.quantity ?? 0) + 1 > row.stockQty) {
        message.error(`Only ${row.stockQty} in stock for size ${row.sizeLabel}`);
        return;
      }

      cart.addItem({
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        sizeId: row.sizeId,
        sizeLabel: row.sizeLabel,
        attributes: row.attributes,
        quantity: 1,
        unitPrice: row.basePrice,
      });

      // Show the flash ribbon for 2.5 seconds
      setLastAdded(row);
      const timer = setTimeout(() => setLastAdded(null), 2500);

      return () => clearTimeout(timer);
    },
    [cart, message]
  );

  // pendingCameraScan holds the raw SKU string after a camera scan until we can
  // attempt an auto-add (we need variantRows to re-derive first).
  const pendingCameraScanRef = useRef<string | null>(null);

  // Called when barcode is scanned via camera
  // Sanitizes the scanned barcode to remove noise and validate format
  const handleCameraScan = useCallback((decodedText: string) => {
    const sanitized = sanitizeScannedBarcode(decodedText);
    if (!sanitized) {
      message.error("Invalid barcode format. Please try scanning again.");
      return;
    }
    pendingCameraScanRef.current = sanitized;
    setSearch(sanitized);
    setCameraScanOpen(false);
  }, [message]);

  // After a camera scan the search query changes → useProducts fetches data →
  // variantRows re-derives. Once it settles, try an exact-match auto-add.
  useEffect(() => {
    const pending = pendingCameraScanRef.current;
    if (!pending || productsLoading) return;

    const s = pending.toUpperCase();
    const exactMatches = variantRows.filter(
      (r) => r.variantSku?.toUpperCase() === s || r.externalBarcode?.toUpperCase() === s
    );
    if (exactMatches.length === 1) {
      pendingCameraScanRef.current = null;
      handleAddToCart(exactMatches[0]);
      setSearch("");
    }
    // If multiple or zero exact matches, show the list for user selection.
  }, [variantRows, productsLoading, handleAddToCart]);

  // Called when user presses Enter in the scan input (barcode scanner sends Enter)
  const handleScanEnter = useCallback(() => {
    const s = search.trim().toUpperCase();
    if (!s || productsLoading) return;
    
    const exact = variantRows.find(
      (r) => r.variantSku?.toUpperCase() === s || r.externalBarcode?.toUpperCase() === s
    );
    if (exact) {
      handleAddToCart(exact);
      setSearch("");
    }
    // No exact match → keep search results visible for manual selection
  }, [search, variantRows, productsLoading, handleAddToCart]);

  // ─── Sale creation ─────────────────────────────────────────────────────────
  const handleConfirmSale = async () => {
    if (cart.items.length === 0) {
      message.warning("Cart is empty");
      return;
    }

    setSaleLoading(true);
    try {
      const sale = await createSale(cart.toCreateInput());
      setCompletedSale(sale);
      setInvoiceOpen(true);
      cart.clearCart();
      message.success(`Sale created: ${sale.invoiceNumber}`);
    } 
    catch (error) {
      console.error(error);
      message.error("Failed to create sale");
    } 
    finally {
      setSaleLoading(false);
    }
  };

  // ─── Promo handlers ────────────────────────────────────────────────────────
  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const offer = promos.find((o) => o.code === code && o.isActive);
    if (!offer) {
      setPromoError("Invalid or inactive promo code");
      return;
    }

    setAppliedPromo(offer);
    setPromoError("");
    setPromoInput("");
    cart.setDiscountPct(offer.discountPct);
    cart.setPromoCodeId(offer.id);
  };

  const handleClearPromo = () => {
    setAppliedPromo(null);
    setPromoError("");
    cart.setDiscountPct(0);
    cart.setPromoCodeId(null);
  };

  const handleSelectOffer = (id: string | null) => {
    if (!id) {
      handleClearPromo();
      return;
    }

    const offer = promos.find((o) => o.id === id);
    if (!offer) return;

    setAppliedPromo(offer);
    setPromoError("");
    setPromoInput("");
    cart.setDiscountPct(offer.discountPct);
    cart.setPromoCodeId(offer.id);
  };

  // ─── Derived values ────────────────────────────────────────────────────────
  const discountAmount = Math.round((cart.subtotal * cart.discountPct) / 100);
  const taxAmount = Math.round((cart.subtotal * cart.taxPct) / 100);
  const total = cart.subtotal - discountAmount + taxAmount;
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const canConfirm =
    cart.items.length > 0 &&
    cart.customerName.trim().length > 0 &&
    cart.customerPhone.length >= 10;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ViewAWrapper>
      {/* ─── Left: Scan + Cart ─────────────────────────────────────────────── */}
      <ScanProductPane>
        {/* Scan hero */}
        <ScanHeroBox>
          <ScanHeroLabelRow>
            <ScanBlinker />
            <ScanHeroLabelText>Ready to Scan</ScanHeroLabelText>
          </ScanHeroLabelRow>
          <ScanHeroInputRow>
            <ScanHeroInput
              prefix={<SearchOutlined />}
              placeholder="Scan barcode or search by name / SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleScanEnter}
              allowClear
              size="large"
              style={{ flex: 1 }}
            />
            {cameraSupported && (
              <CameraScanBtn
                type="button"
                onClick={() => setCameraScanOpen(true)}
                title="Scan via camera"
              >
                <CameraOutlined style={{ fontSize: 16 }} />
                Scan
              </CameraScanBtn>
            )}
          </ScanHeroInputRow>
          <ScanHeroHint>
            Barcode scanners auto-press Enter — exact barcode match is added instantly &nbsp;·&nbsp; Focus:
            <KbdKey>F2</KbdKey>
            {cameraSupported && (
              <>&nbsp;·&nbsp; Camera: <KbdKey>Scan</KbdKey> button</>
            )}
          </ScanHeroHint>
        </ScanHeroBox>

        {/* Flash ribbon — shown briefly after a successful scan */}
        {lastAdded && (
          <ScanFlash>
            <ScanFlashInfo>
              <ScanFlashName>{lastAdded.productName}</ScanFlashName>
              <ScanFlashMeta>
                {lastAdded.variantSku && <ScanFlashSku>{lastAdded.variantSku}</ScanFlashSku>}
                <ScanFlashSize>{lastAdded.sizeLabel}</ScanFlashSize>
              </ScanFlashMeta>
            </ScanFlashInfo>
            <ScanFlashPrice>{formatCurrency(lastAdded.basePrice)}</ScanFlashPrice>
            <ScanAddedBadge>
              <CheckOutlined /> Added
            </ScanAddedBadge>
          </ScanFlash>
        )}

        {/* Search results panel — visible while search is active */}
        {search.trim() && (
          <ResultsBox>
            <ResultsBoxHeader>
              <ResultsBoxTitle>Search results</ResultsBoxTitle>
              <ResultsCountBadge>
                {productsLoading ? "…" : `${variantRows.length} found`}
              </ResultsCountBadge>
            </ResultsBoxHeader>
            {productsLoading ? (
              <div style={{ padding: 16, textAlign: "center" }}>
                <Spin size="small" />
              </div>
            ) : variantRows.length === 0 ? (
              <div style={{ padding: 14, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No products found
              </div>
            ) : (
              <ResultsScrollBody>
                {variantRows.map((row) => (
                  <ResultRow key={row.rowKey}>
                    <ResultProductCol>
                      <ResultProductName>{row.productName}</ResultProductName>
                      <ResultProductBrand>
                        {row.brandName} · {row.categoryName}
                      </ResultProductBrand>
                    </ResultProductCol>
                    {row.variantSku && <ResultSkuPill>{row.variantSku}</ResultSkuPill>}
                    <ResultSizeBadge>{row.sizeLabel}</ResultSizeBadge>
                    <ResultStockText
                      $out={row.stockQty === 0}
                      $low={row.stockQty > 0 && row.stockQty <= 5}
                    >
                      {row.stockQty === 0 ? "Out" : `${row.stockQty}`}
                    </ResultStockText>
                    <ResultPriceText>{formatCurrency(row.basePrice)}</ResultPriceText>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        handleAddToCart(row);
                        setSearch("");
                      }}
                      disabled={row.stockQty === 0 || !row.isActive}
                      style={{ borderRadius: 7, fontSize: 12, fontWeight: 600 }}
                    >
                      + Add
                    </Button>
                  </ResultRow>
                ))}
              </ResultsScrollBody>
            )}
          </ResultsBox>
        )}

        {/* Cart item rows */}
        <CartSectionWrap>
          <CartListHeader>
            <CartListTitle>
              Cart{totalItems > 0 ? ` (${totalItems} item${totalItems !== 1 ? "s" : ""})` : ""}
            </CartListTitle>
            {cart.items.length > 0 && (
              <ClearAllBtn onClick={cart.clearCart}>Clear all</ClearAllBtn>
            )}
          </CartListHeader>

          {cart.items.length === 0 ? (
            <CartEmptyState>
              <CartEmptyIcon>🛒</CartEmptyIcon>
              <CartEmptyText>
                Cart is empty
                <br />
                Scan a barcode or search above to add items
              </CartEmptyText>
            </CartEmptyState>
          ) : (
            <CartRows>
              {cart.items.map((item, idx) => (
                <CartRowItem key={`${item.productId}-${item.sizeId}`}>
                  <RowNumber>{idx + 1}</RowNumber>
                  <RowInfoWrap>
                    <RowProductName>{item.productName}</RowProductName>
                    <RowMetaLine>
                      <RowSizePill>{item.sizeLabel}</RowSizePill>
                      {Object.values(item.attributes ?? {})
                        .filter((v) => {
                          const s = String(v).trim().toLowerCase();
                          return (
                            s !== "" &&
                            !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(s)
                          );
                        })
                        .map((v, i) => (
                          <RowAttrPill key={i}>{String(v)}</RowAttrPill>
                        ))}
                      <RowSkuPill>{item.sku}</RowSkuPill>
                    </RowMetaLine>
                  </RowInfoWrap>
                  <RowQtyCtrl>
                    <RowQtyBtn
                      onClick={() =>
                        cart.updateQuantity(
                          item.productId,
                          item.sizeId,
                          Math.max(1, item.quantity - 1)
                        )
                      }
                    >
                      −
                    </RowQtyBtn>
                    <RowQtyVal>{item.quantity}</RowQtyVal>
                    <RowQtyBtn
                      onClick={() =>
                        cart.updateQuantity(item.productId, item.sizeId, item.quantity + 1)
                      }
                    >
                      +
                    </RowQtyBtn>
                  </RowQtyCtrl>
                  <RowTotal>{formatCurrency(item.unitPrice * item.quantity)}</RowTotal>
                  <RowDelBtn onClick={() => cart.removeItem(item.productId, item.sizeId)}>
                    ✕
                  </RowDelBtn>
                </CartRowItem>
              ))}
            </CartRows>
          )}
        </CartSectionWrap>
      </ScanProductPane>

      {/* ─── Right: Checkout panel ─────────────────────────────────────────── */}
      <CheckoutPane>
        <CheckoutHeader>
          <CheckoutHeaderTitle>Checkout</CheckoutHeaderTitle>
          {totalItems > 0 && (
            <CheckoutItemCount>
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </CheckoutItemCount>
          )}
        </CheckoutHeader>

        <CheckoutScrollBody>
          {/* Customer Details */}
          <CheckoutSection>
            <CheckoutSectionLabel>Customer Details</CheckoutSectionLabel>
            <CustomerGrid>
              <CustomerField>
                <FieldLabel>
                  Name <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <Input
                  placeholder="Full name"
                  value={cart.customerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[a-zA-Z\s]*$/.test(val)) cart.setCustomerName(val);
                  }}
                  status={
                    cart.items.length > 0 && !cart.customerName.trim() ? "error" : ""
                  }
                  size="small"
                />
              </CustomerField>
              <CustomerField>
                <FieldLabel>
                  Phone <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <Input
                  placeholder="10-digit no."
                  value={cart.customerPhone}
                  onChange={(e) =>
                    cart.setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  maxLength={10}
                  status={
                    cart.items.length > 0 && cart.customerPhone.length < 10 ? "error" : ""
                  }
                  size="small"
                />
              </CustomerField>
              <CustomerFieldFull>
                <FieldLabel>
                  Email{" "}
                  <span style={{ color: "#9ca3af", fontWeight: "normal" }}>(optional)</span>
                </FieldLabel>
                <Input
                  placeholder="customer@email.com"
                  size="small"
                  value={cart.customerEmail}
                  onChange={(e) => cart.setCustomerEmail(e.target.value)}
                />
              </CustomerFieldFull>
            </CustomerGrid>
            {cart.items.length > 0 &&
              (!cart.customerName.trim() || cart.customerPhone.length < 10) && (
                <CustWarning>⚠ Enter name &amp; phone to confirm sale</CustWarning>
              )}
          </CheckoutSection>

          {/* Payment Method */}
          <CheckoutSection>
            <CheckoutSectionLabel>Payment Method</CheckoutSectionLabel>
            <PayPillsGrid>
              {PAYMENT_OPTIONS.map((opt) => (
                <APayPill
                  key={opt.value}
                  $active={cart.paymentMethod === opt.value}
                  onClick={() => cart.setPaymentMethod(opt.value as PaymentMethodType)}
                >
                  <PayPillEmoji>{opt.icon}</PayPillEmoji>
                  {opt.label}
                </APayPill>
              ))}
            </PayPillsGrid>
          </CheckoutSection>

          {/* Available Offers */}
          <CheckoutSection>
            <CheckoutSectionLabel>
              <TagOutlined /> Available Offers
            </CheckoutSectionLabel>
            <Select
              placeholder="Select an offer…"
              value={appliedPromo?.id ?? null}
              allowClear
              onClear={handleClearPromo}
              style={{ width: "100%" }}
              onChange={handleSelectOffer}
              optionRender={(option) => {
                const data = option.data as { label: string; code: string; desc: string; gradient: string };
                return (
                  <OfferOptionRow>
                    <OfferBadge style={{ background: data.gradient }}>{data.label}</OfferBadge>
                    <OfferOptionInfo>
                      <OfferOptionTitle>{data.code}</OfferOptionTitle>
                      <OfferOptionDesc>{data.desc}</OfferOptionDesc>
                    </OfferOptionInfo>
                  </OfferOptionRow>
                );
              }}
              labelRender={(props) => {
                const activePromos = promos.filter((o) => o.isActive);
                const offerIdx = activePromos.findIndex((o) => o.id === props.value);
                const offer = offerIdx >= 0 ? activePromos[offerIdx] : null;
                const gradient = offer ? GRADIENTS[offerIdx % GRADIENTS.length] : undefined;
                if (!offer) return <span>{String(props.label ?? "")}</span>;
                return (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <OfferBadge style={{ background: gradient }}>{offer.label}</OfferBadge>
                    <span style={{ fontSize: 12, color: "#374151" }}>{offer.code}</span>
                  </span>
                );
              }}
              options={promos
                .filter((o) => o.isActive)
                .map((o, idx) => ({
                  value: o.id,
                  label: o.label,
                  code: o.code,
                  desc: o.desc,
                  discountPct: o.discountPct,
                  gradient: GRADIENTS[idx % GRADIENTS.length],
                }))}
            />
          </CheckoutSection>

          {/* Promo Code */}
          <CheckoutSection>
            <CheckoutSectionLabel>Promo Code</CheckoutSectionLabel>
            {appliedPromo ? (
              <APromoSuccessPill>
                <CheckOutlined />
                {appliedPromo.code} — {appliedPromo.discountPct}% off applied
                <APromoClearBtn onClick={handleClearPromo} title="Remove promo">
                  <CloseOutlined />
                </APromoClearBtn>
              </APromoSuccessPill>
            ) : (
              <>
                <APromoRow>
                  <APromoInput
                    placeholder="ENTER CODE"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError("");
                    }}
                    onPressEnter={handleApplyPromo}
                    size="small"
                  />
                  <APromoApplyBtn
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim()}
                    size="small"
                  >
                    Apply
                  </APromoApplyBtn>
                </APromoRow>
                {promoError && (
                  <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>
                    {promoError}
                  </div>
                )}
              </>
            )}
          </CheckoutSection>

          {/* Order Summary */}
          <CheckoutSection>
            <CheckoutSectionLabel>Order Summary</CheckoutSectionLabel>
            <SummaryCardWrap>
              <ASumRow>
                <span>Subtotal ({totalItems} items)</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </ASumRow>
              <ASumRow>
                <span>Discount</span>
                <ASumPctGroup>
                  <ASumPctInput
                    min={0}
                    max={100}
                    value={cart.discountPct}
                    onChange={(val) => {
                      cart.setDiscountPct((val as number) ?? 0);
                      setAppliedPromo(null);
                      cart.setPromoCodeId(null);
                    }}
                    size="small"
                    suffix="%"
                  />
                  {discountAmount > 0 && (
                    <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                      = {formatCurrency(discountAmount)}
                    </span>
                  )}
                </ASumPctGroup>
              </ASumRow>
              <ASumRow>
                <span>Tax (GST)</span>
                <ASumPctGroup>
                  <ASumPctInput
                    min={0}
                    max={100}
                    value={cart.taxPct}
                    onChange={(val) => cart.setTaxPct((val as number) ?? 0)}
                    size="small"
                    suffix="%"
                  />
                  {taxAmount > 0 && (
                    <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                      = {formatCurrency(taxAmount)}
                    </span>
                  )}
                </ASumPctGroup>
              </ASumRow>
              <ATotalRow>
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </ATotalRow>
            </SummaryCardWrap>
          </CheckoutSection>
        </CheckoutScrollBody>

        {/* Footer — confirm button */}
        <CheckoutFooter>
          <Button
            type="primary"
            block
            size="large"
            loading={saleLoading}
            disabled={!canConfirm}
            onClick={handleConfirmSale}
            style={{
              height: 46,
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              background: canConfirm
                ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                : undefined,
              border: "none",
            }}
          >
            <CheckOutlined /> Confirm Sale — {formatCurrency(total)}
          </Button>
          {cart.items.length > 0 && !canConfirm && (
            <ConfirmHint>Enter customer name &amp; phone to enable</ConfirmHint>
          )}
          <SecureText>
            <LockOutlined /> Secure checkout · All transactions encrypted
          </SecureText>
        </CheckoutFooter>
      </CheckoutPane>

      {/* Invoice preview after sale completion */}
      <InvoicePreview
        sale={completedSale}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setCompletedSale(null);
        }}
      />

      {/* Camera barcode scanner modal */}
      {cameraScanOpen && (
        <CameraBarcodeScannerModal
          open={cameraScanOpen}
          onScan={handleCameraScan}
          onClose={() => setCameraScanOpen(false)}
        />
      )}
    </ViewAWrapper>
  );
};

export default BillingView;
