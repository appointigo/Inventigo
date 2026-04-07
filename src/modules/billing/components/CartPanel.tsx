"use client";

import { useState, useEffect } from "react";
import { Typography, Input, Select } from "antd";
import { DeleteOutlined, ShoppingCartOutlined, CheckOutlined, LockOutlined, TagOutlined, CloseOutlined } from "@ant-design/icons";
import type { CartItem, PaymentMethodType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import {
  PanelWrapper,
  PanelHeader,
  PanelTitleIcon,
  PanelTitle,
  PanelItemBadge,
  ItemsArea,
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
  EmptyCartPane,
  EmptyCartIcon,
  EmptyCartText,
  EmptyCartHint,
  PanelScrollBody,
  PanelSection,
  SectionLabel,
  PanelDivider,
  PayPillsRow,
  PayPill,
  PayIcon,
  CustomerRow,
  OfferOptionRow,
  OfferBadge,
  OfferOptionInfo,
  OfferOptionTitle,
  OfferOptionDesc,
  SummaryCard,
  SumRow,
  TotalRow,
  SavingsRow,
  SumInput,
  PromoRow,
  PromoInput,
  PromoApplyBtn,
  PromoSuccessPill,
  PromoClearBtn,
  PanelFooter,
  ConfirmButton,
  SecureNote,
} from "./CartPanel.styled";

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

interface CartPanelProps {
  items: CartItem[];
  subtotal: number;
  discountPct: number;
  taxPct: number;
  defaultTaxPct?: number;
  paymentMethod: PaymentMethodType;
  customerName: string;
  customerPhone: string;
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

const CartPanel = ({
  items,
  subtotal,
  discountPct,
  taxPct,
  defaultTaxPct,
  paymentMethod,
  customerName,
  customerPhone,
  onUpdateQuantity,
  onRemoveItem,
  onDiscountPctChange,
  onTaxPctChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onConfirmSale,
  loading,
}: CartPanelProps) => {
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoOffer | null>(null);
  const [promoError, setPromoError] = useState("");

  // Auto-apply tax rate from billing config on first render
  useEffect(() => {
    if (defaultTaxPct != null && defaultTaxPct > 0 && taxPct === 0) {
      onTaxPctChange(defaultTaxPct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTaxPct]);

  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const taxAmount = Math.round((subtotal * taxPct) / 100);
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
    onDiscountPctChange(offer.discountPct);
  };

  const handleClearPromo = () => {
    setAppliedPromo(null);
    setPromoError("");
    onDiscountPctChange(0);
  };

  const handleSelectOffer = (code: string | null) => {
    if (!code) {
      handleClearPromo();
      return;
    }

    const offer = AVAILABLE_OFFERS.find((o) => o.code === code);
    if (!offer) return;

    setAppliedPromo(offer);
    setPromoError("");
    setPromoInput("");
    onDiscountPctChange(offer.discountPct);
  };

  return (
    <PanelWrapper>
      {/* Header */}
      <PanelHeader>
        <PanelTitleIcon>
          <ShoppingCartOutlined />
        </PanelTitleIcon>
        <PanelTitle>Cart</PanelTitle>
        {totalItems > 0 && (
          <PanelItemBadge>
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </PanelItemBadge>
        )}
      </PanelHeader>

      {items.length === 0 ? (
        <EmptyCartPane>
          <EmptyCartIcon>🛒</EmptyCartIcon>
          <EmptyCartText>Cart is empty</EmptyCartText>
          <EmptyCartHint>
            Search or scan products on the left to add them here
          </EmptyCartHint>
        </EmptyCartPane>
      ) : (
        <>
          {/* Items — shows up to 3 without scrolling, then scrolls */}
          <ItemsArea>
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
                        return (
                          s !== "" &&
                          !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(s)
                        );
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
                          onUpdateQuantity(
                            item.productId,
                            item.sizeId,
                            Math.max(1, item.quantity - 1)
                          )
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
                    <LineTotalText>
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </LineTotalText>
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
          </ItemsArea>

          <PanelDivider />

          {/* Scrollable sections */}
          <PanelScrollBody>
            {/* Customer */}
            <PanelSection>
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
                  size="small"
                />
                <Input
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    onCustomerPhoneChange(val);
                  }}
                  maxLength={10}
                  size="small"
                />
              </CustomerRow>
            </PanelSection>

            <PanelDivider />

            {/* Payment */}
            <PanelSection>
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
            </PanelSection>

            <PanelDivider />

            {/* Available Offers — dropdown with cards */}
            <PanelSection>
              <SectionLabel>
                <TagOutlined />
                Available Offers
              </SectionLabel>
              <Select
                placeholder="Select an offer..."
                value={appliedPromo?.code ?? null}
                allowClear
                onClear={handleClearPromo}
                style={{ width: "100%" }}
                onChange={handleSelectOffer}
                optionRender={(option) => {
                  const data = option.data as { label: string; desc: string };
                  return (
                    <OfferOptionRow>
                      <OfferBadge>{data.label}</OfferBadge>
                      <OfferOptionInfo>
                        <OfferOptionTitle>{option.value as string}</OfferOptionTitle>
                        <OfferOptionDesc>{data.desc}</OfferOptionDesc>
                      </OfferOptionInfo>
                    </OfferOptionRow>
                  );
                }}
                labelRender={(props) => {
                  const offer = AVAILABLE_OFFERS.find((o) => o.code === props.value);
                  if (!offer) return <span>{String(props.label ?? "")}</span>;
                  return (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <OfferBadge>{offer.label}</OfferBadge>
                      <span style={{ fontSize: 12, color: "#374151" }}>{offer.code}</span>
                    </span>
                  );
                }}
                options={AVAILABLE_OFFERS.map((o) => ({
                  value: o.code,
                  label: o.label,
                  desc: o.desc,
                  discountPct: o.discountPct,
                }))}
              />
            </PanelSection>

            <PanelDivider />

            {/* Promo Code */}
            <PanelSection>
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
                    />
                    <PromoApplyBtn
                      type="default"
                      onClick={handleApplyPromo}
                      disabled={!promoInput.trim()}
                    >
                      Apply
                    </PromoApplyBtn>
                  </PromoRow>
                  {promoError && (
                    <Text type="danger" style={{ fontSize: 12 }}>
                      {promoError}
                    </Text>
                  )}
                </>
              )}
            </PanelSection>

            <PanelDivider />

            {/* Order Summary */}
            <PanelSection>
              <SectionLabel>Order Summary</SectionLabel>
              <SummaryCard>
                <SumRow>
                  <Text type="secondary">Subtotal ({totalItems} items)</Text>
                  <Text>{formatCurrency(subtotal)}</Text>
                </SumRow>
                <SumRow>
                  <Text type="secondary">Discount</Text>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <SumInput
                      min={0}
                      max={100}
                      value={discountPct}
                      onChange={(val) => {
                        onDiscountPctChange((val as number) ?? 0);
                        setAppliedPromo(null);
                      }}
                      size="small"
                      suffix="%"
                    />
                    {discountAmount > 0 && (
                      <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        = {formatCurrency(discountAmount)}
                      </Text>
                    )}
                  </span>
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
            </PanelSection>
          </PanelScrollBody>
        </>
      )}

      {/* Footer — always pinned to bottom */}
      <PanelFooter>
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
      </PanelFooter>
    </PanelWrapper>
  );
};

export default CartPanel;
