"use client";

import { Drawer, Typography, Input } from "antd";
import { DeleteOutlined, ShoppingCartOutlined, LockOutlined, CheckOutlined } from "@ant-design/icons";
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
} from "./CartDrawer.styled";

const { Text } = Typography;

const PAYMENT_OPTIONS: { label: string; value: PaymentMethodType; icon: string }[] = [
  { label: "Cash", value: "CASH", icon: "💵" },
  { label: "Card", value: "CARD", icon: "💳" },
  { label: "UPI", value: "UPI", icon: "📱" },
];

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  discountAmount: number;
  taxAmount: number;
  paymentMethod: PaymentMethodType;
  customerName: string;
  customerPhone: string;
  onClose: () => void;
  onUpdateQuantity: (productId: string, sizeId: string, quantity: number) => void;
  onRemoveItem: (productId: string, sizeId: string) => void;
  onDiscountChange: (amount: number) => void;
  onTaxChange: (amount: number) => void;
  onPaymentMethodChange: (method: PaymentMethodType) => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onConfirmSale: () => void;
  loading: boolean;
}

const CartDrawer = ({
  open,
  items,
  discountAmount,
  taxAmount,
  paymentMethod,
  customerName,
  customerPhone,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onDiscountChange,
  onTaxChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onConfirmSale,
  loading,
}: CartDrawerProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal - discountAmount + taxAmount;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

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

          {/* Summary */}
          <DrawerSection>
            <SectionLabel>Order Summary</SectionLabel>
            <SummaryCard>
              <SumRow>
                <Text type="secondary">Subtotal ({totalItems} items)</Text>
                <Text>{formatCurrency(subtotal)}</Text>
              </SumRow>
              <SumRow>
                <Text type="secondary">Discount</Text>
                <SumInput
                  min={0}
                  max={subtotal}
                  value={discountAmount}
                  onChange={(val) => onDiscountChange((val as number) ?? 0)}
                  size="small"
                  prefix="₹"
                />
              </SumRow>
              <SumRow>
                <Text type="secondary">Tax</Text>
                <SumInput
                  min={0}
                  value={taxAmount}
                  onChange={(val) => onTaxChange((val as number) ?? 0)}
                  size="small"
                  prefix="₹"
                />
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