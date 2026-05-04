"use client";

import { useState, useEffect } from "react";
import { Drawer, Typography, Input } from "antd";
import { DeleteOutlined, ShoppingCartOutlined, LockOutlined, CheckOutlined, TagOutlined, CloseOutlined } from "@ant-design/icons";
import type { CartItem, PaymentMethodType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import {
  DrawerTitleRow,
  DrawerTitleText,
  ItemCountBadge,
  StepsBar,
  StepItem,
  StepCircle,
  StepLabel,
  CartItemsContainer,
  CartItemCard,
  ItemBody,
  ItemNameText,
  ItemMetaText,
  SizeChip,
  AttrChip,
  ItemPriceRow,
  UnitPriceText,
  LineTotalText,
  QtyController,
  QtyControlBtn,
  QtyDisplay,
  DeleteBtn,
  EmptyCartWrap,
  EmptyCartIcon,
  EmptyCartText,
  SectionLabel,
  PayPillsRow,
  PayPill,
  PayIcon,
  CustomerRow,
  SummaryCard,
  SumRow,
  TotalRow,
  SavingsRow,
  SumInput,
  DrawerFooter,
  ConfirmButton,
  SecureNote,
  DrawerSection,
  CartDivider,
  PromoRow,
  PromoInput,
  PromoApplyBtn,
  PromoSuccessPill,
  PromoClearBtn,
  OffersGrid,
  OfferCard,
  OfferBadge,
  OfferInfo,
  OfferTitle,
  OfferDesc,
  OfferAppliedTag,
} from "./CartDrawer.styled";

const { Text } = Typography;

const PAYMENT_OPTIONS: { label: string; value: PaymentMethodType; icon: string }[] = [
  { label: "Cash", value: "CASH", icon: "💵" },
  { label: "Card", value: "CARD", icon: "💳" },
  { label: "UPI", value: "UPI", icon: "📱" },
];

interface PromoOffer {
  code: string;
  label: string;
  desc: string;
  discountPct: number;
}

const AVAILABLE_OFFERS: PromoOffer[] = [
  { code: "SAVE10", label: "10% OFF", desc: "Flat 10% discount on your order", discountPct: 10 },
  { code: "FLAT15", label: "15% OFF", desc: "Save 15% — use code FLAT15", discountPct: 15 },
  { code: "NEWUSER", label: "5% OFF", desc: "Welcome discount for new customers", discountPct: 5 },
];

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  discountPct: number;
  taxPct: number;
  defaultTaxPct?: number;
  subtotal: number;
  paymentMethod: PaymentMethodType;
  customerName: string;
  customerPhone: string;
  onClose: () => void;
  onUpdateQuantity: (productId: string, sizeId: string, quantity: number) => void;
  onRemoveItem: (productId: string, sizeId: string) => void;
  onDiscountPctChange: (pct: number) => void;
  onTaxPctChange: (pct: number) => void;
  onPaymentMethodChange: (method: PaymentMethodType) => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onConfirmSale: () => void;
  loading: boolean;
}

const CartDrawer = ({
  open,
  items,
  discountPct,
  taxPct,
  defaultTaxPct,
  subtotal,
  paymentMethod,
  customerName,
  customerPhone,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onDiscountPctChange,
  onTaxPctChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onConfirmSale,
  loading,
}: CartDrawerProps) => {
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoOffer | null>(null);
  const [promoError, setPromoError] = useState("");
  const [discountMode, setDiscountMode] = useState<"PERCENT" | "RUPEE">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(discountPct);

  const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  // Apply default tax pct from billing config on first open
  useEffect(() => {
    if (open && defaultTaxPct != null && defaultTaxPct > 0 && taxPct === 0) {
      onTaxPctChange(defaultTaxPct);
    }
  }, [open, defaultTaxPct]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (discountMode !== "RUPEE") return;
    const max = Math.max(0, subtotal);
    const clamped = clampNumber(discountValue, 0, max);
    const normalized = max > 0 ? (clamped / max) * 100 : 0;
    if (Math.abs(discountPct - normalized) > 0.01) {
      onDiscountPctChange(normalized);
    }
  }, [discountMode, discountValue, subtotal, discountPct, onDiscountPctChange]);

  const percentValue = clampNumber(discountPct, 0, 100);
  const rupeeValue = clampNumber(discountValue, 0, Math.max(0, subtotal));
  const discountAmount = Math.round(
    discountMode === "RUPEE"
      ? rupeeValue
      : (subtotal * percentValue) / 100
  );
  const taxAmount = Math.round(subtotal * taxPct / 100);
  const total = subtotal - discountAmount + taxAmount;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const offer = AVAILABLE_OFFERS.find((o) => o.code === code);
    if (!offer) {
      setPromoError("Invalid promo code");
      return;
    }
    setAppliedPromo(offer);
    setPromoError("");
    setPromoInput("");
    setDiscountMode("PERCENT");
    setDiscountValue(offer.discountPct);
    onDiscountPctChange(offer.discountPct);
  };

  const handleClearPromo = () => {
    setAppliedPromo(null);
    setPromoError("");
    setDiscountMode("PERCENT");
    setDiscountValue(0);
    onDiscountPctChange(0);
  };

  const handleApplyOffer = (offer: PromoOffer) => {
    if (appliedPromo?.code === offer.code) {
      handleClearPromo();
      return;
    }
    setAppliedPromo(offer);
    setPromoError("");
    setPromoInput("");
    setDiscountMode("PERCENT");
    setDiscountValue(offer.discountPct);
    onDiscountPctChange(offer.discountPct);
  };

  return (
    <Drawer
      title={
        <DrawerTitleRow>
          <ShoppingCartOutlined />
          <DrawerTitleText>Cart</DrawerTitleText>
          {items.length > 0 && (
            <ItemCountBadge>{totalItems} item{totalItems !== 1 ? "s" : ""}</ItemCountBadge>
          )}
        </DrawerTitleRow>
      }
      open={open}
      onClose={onClose}
      size={480}
      styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" } }}
      footer={null}
    >
      {/* Progress steps */}
      <StepsBar>
        <StepItem $state="done">
          <StepCircle $state="done"><CheckOutlined /></StepCircle>
          <StepLabel $active>Products</StepLabel>
        </StepItem>
        <StepItem $state="active">
          <StepCircle $state="active">2</StepCircle>
          <StepLabel $active>Review</StepLabel>
        </StepItem>
        <StepItem $state="idle">
          <StepCircle $state="idle">3</StepCircle>
          <StepLabel $active={false}>Confirm</StepLabel>
        </StepItem>
      </StepsBar>

      {/* Scrollable body */}
      {items.length === 0 ? (
        <EmptyCartWrap>
          <EmptyCartIcon>🛒</EmptyCartIcon>
          <EmptyCartText>No items added yet</EmptyCartText>
        </EmptyCartWrap>
      ) 
      : (
        <>
          {/* Items */}
          <CartItemsContainer>
            {items.map((item) => (
              <CartItemCard key={`${item.productId}-${item.sizeId}`}>
                <ItemBody>
                  <ItemNameText>{item.productName}</ItemNameText>
                  <ItemMetaText>
                    {item.sku}
                    <SizeChip>{item.sizeLabel}</SizeChip>
                    {Object.values(item.attributes ?? {})
                      .filter((v) => {
                        const s = String(v).trim().toLowerCase();
                        return s !== "" && !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(s);
                      })
                      .map((v, i) => (
                        <AttrChip key={i}>{String(v)}</AttrChip>
                      ))}
                  </ItemMetaText>
                  <ItemPriceRow>
                    <UnitPriceText>{formatCurrency(item.unitPrice)} each</UnitPriceText>
                    <QtyController>
                      <QtyControlBtn
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.sizeId, Math.max(1, item.quantity - 1))
                        }
                      >
                        −
                      </QtyControlBtn>
                      <QtyDisplay>{item.quantity}</QtyDisplay>
                      <QtyControlBtn
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.sizeId, item.quantity + 1)
                        }
                      >
                        +
                      </QtyControlBtn>
                    </QtyController>
                    <LineTotalText>{formatCurrency(item.unitPrice * item.quantity)}</LineTotalText>
                  </ItemPriceRow>
                </ItemBody>
                <DeleteBtn
                  onClick={() => onRemoveItem(item.productId, item.sizeId)}
                  title="Remove"
                >
                  <DeleteOutlined />
                </DeleteBtn>
              </CartItemCard>
            ))}
          </CartItemsContainer>

          <CartDivider />

          {/* Customer */}
          <DrawerSection>
            <SectionLabel>Customer (Optional)</SectionLabel>
            <CustomerRow>
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[a-zA-Z\s]*$/.test(val)) {
                    onCustomerNameChange(val);
                  }
                }}
                size="middle"
              />
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  onCustomerPhoneChange(val);
                }}
                maxLength={10}
                size="middle"
              />
            </CustomerRow>
          </DrawerSection>

          <CartDivider />

          {/* Payment */}
          <DrawerSection>
            <SectionLabel>Payment Method</SectionLabel>
            <PayPillsRow>
              {PAYMENT_OPTIONS.map((opt) => (
                <PayPill
                  key={opt.value}
                  $active={paymentMethod === opt.value}
                  onClick={() => onPaymentMethodChange(opt.value)}
                >
                  <PayIcon>{opt.icon}</PayIcon>
                  {opt.label}
                </PayPill>
              ))}
            </PayPillsRow>
          </DrawerSection>

          <CartDivider />

          {/* Available Offers */}
          <DrawerSection>
            <SectionLabel><TagOutlined style={{ marginRight: 4 }} />Available Offers</SectionLabel>
            <OffersGrid>
              {AVAILABLE_OFFERS.map((offer) => {
                const isApplied = appliedPromo?.code === offer.code;
                return (
                  <OfferCard
                    key={offer.code}
                    $applied={isApplied}
                    onClick={() => handleApplyOffer(offer)}
                  >
                    <OfferBadge>{offer.label}</OfferBadge>
                    <OfferInfo>
                      <OfferTitle>{offer.code}</OfferTitle>
                      <OfferDesc>{offer.desc}</OfferDesc>
                    </OfferInfo>
                    {isApplied && <OfferAppliedTag>✓ Applied</OfferAppliedTag>}
                  </OfferCard>
                );
              })}
            </OffersGrid>
          </DrawerSection>

          <CartDivider />

          {/* Promo Code */}
          <DrawerSection>
            <SectionLabel>Promo Code</SectionLabel>
            {appliedPromo ? (
              <PromoSuccessPill>
                <CheckOutlined />
                {appliedPromo.code} — {appliedPromo.discountPct}% off applied
                <PromoClearBtn onClick={handleClearPromo} title="Remove promo">
                  <CloseOutlined />
                </PromoClearBtn>
              </PromoSuccessPill>
            ) : (
              <>
                <PromoRow>
                  <PromoInput
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError("");
                    }}
                    onPressEnter={handleApplyPromo}
                    size="small"
                  />
                  <PromoApplyBtn
                    type="default"
                    size="small"
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim()}
                  >
                    Apply
                  </PromoApplyBtn>
                </PromoRow>
                {promoError && (
                  <Text type="danger" style={{ fontSize: 12 }}>{promoError}</Text>
                )}
              </>
            )}
          </DrawerSection>

          <CartDivider />

          {/* Summary */}
          <DrawerSection>
            <SectionLabel>Order Summary</SectionLabel>
            <SummaryCard>
              <SumRow>
                <Text type="secondary">Subtotal ({totalItems} items)</Text>
                <Text>{formatCurrency(subtotal)}</Text>
              </SumRow>
              <SumRow>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Text type="secondary">Discount</Text>
                  <div style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode("PERCENT");
                        setDiscountValue(discountPct);
                      }}
                      style={{
                        padding: "2px 8px",
                        border: "none",
                        background: discountMode === "PERCENT" ? "#111827" : "transparent",
                        color: discountMode === "PERCENT" ? "#fff" : "#6b7280",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const normalized = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
                        setDiscountMode("RUPEE");
                        setDiscountValue(discountAmount);
                        onDiscountPctChange(normalized);
                        setAppliedPromo(null);
                      }}
                      style={{
                        padding: "2px 8px",
                        border: "none",
                        background: discountMode === "RUPEE" ? "#111827" : "transparent",
                        color: discountMode === "RUPEE" ? "#fff" : "#6b7280",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      ₹
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <SumInput
                    min={0}
                    max={discountMode === "PERCENT" ? 100 : Math.max(0, subtotal)}
                    value={discountMode === "PERCENT" ? percentValue : rupeeValue}
                    onChange={(val) => {
                      const numeric = Number(val ?? 0);
                      const max = discountMode === "PERCENT" ? 100 : Math.max(0, subtotal);
                      const clamped = clampNumber(numeric, 0, max);
                      setDiscountValue(clamped);
                      if (discountMode === "PERCENT") {
                        onDiscountPctChange(clamped);
                      } else {
                        const normalized = subtotal > 0 ? (clamped / subtotal) * 100 : 0;
                        onDiscountPctChange(normalized);
                      }
                      setAppliedPromo(null);
                    }}
                    size="small"
                    suffix={discountMode === "PERCENT" ? "%" : "₹"}
                  />
                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    - {formatCurrency(discountAmount)}
                  </Text>
                </div>
              </SumRow>
              <SumRow>
                <Text type="secondary">Tax (GST)</Text>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <SumInput
                    min={0}
                    max={100}
                    value={taxPct}
                    onChange={(val) => onTaxPctChange((val as number) ?? 0)}
                    size="small"
                    suffix="%"
                  />
                  {taxAmount > 0 && (
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      = {formatCurrency(taxAmount)}
                    </Text>
                  )}
                </span>
              </SumRow>
              <TotalRow>
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </TotalRow>
              {discountAmount > 0 && (
                <SavingsRow>
                  <CheckOutlined />
                  You save {formatCurrency(discountAmount)}
                </SavingsRow>
              )}
            </SummaryCard>
          </DrawerSection>
        </>
      )}

      {/* Footer */}
      <DrawerFooter>
        <ConfirmButton
          type="primary"
          block
          size="large"
          onClick={onConfirmSale}
          loading={loading}
          disabled={items.length === 0}
        >
          <CheckOutlined />
          Confirm Sale — {formatCurrency(total)}
        </ConfirmButton>
        <SecureNote>
          <LockOutlined />
          Secure checkout · All transactions encrypted
        </SecureNote>
      </DrawerFooter>
    </Drawer>
  );
}

export default CartDrawer;
