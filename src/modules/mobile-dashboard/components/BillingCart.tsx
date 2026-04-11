"use client";

import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button, Drawer, Empty, Input, Select, Space, Typography } from "antd";
import type { PaymentMethodType } from "@/modules/billing/types";

const PAYMENT_OPTIONS: Array<{ value: PaymentMethodType; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
];

export function BillingCart({
  open,
  onClose,
  items,
  subtotal,
  taxPct,
  onTaxChange,
  paymentMethod,
  onPaymentMethodChange,
  customerName,
  onCustomerNameChange,
  onQuantityChange,
  onRemove,
  onCheckout,
  checkoutLoading,
}: {
  open: boolean;
  onClose: () => void;
  items: Array<{ productId: string; sizeId: string; productName: string; sizeLabel: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  taxPct: number;
  onTaxChange: (value: number) => void;
  paymentMethod: PaymentMethodType;
  onPaymentMethodChange: (value: PaymentMethodType) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  onQuantityChange: (productId: string, sizeId: string, quantity: number) => void;
  onRemove: (productId: string, sizeId: string) => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
}) {
  const taxAmount = Math.round(subtotal * taxPct / 100);
  const total = subtotal + taxAmount;

  return (
    <Drawer title="Billing Cart" placement="right" open={open} onClose={onClose} size={420} destroyOnHidden>
      <div style={{ display: "grid", gap: 16 }}>
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items in cart" />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <div key={`${item.productId}-${item.sizeId}`} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <Typography.Text strong>{item.productName}</Typography.Text>
                    <div style={{ color: "#64748b", marginTop: 4 }}>{item.sizeLabel}</div>
                    <div style={{ marginTop: 6 }}>Rs {item.unitPrice.toFixed(2)}</div>
                  </div>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(item.productId, item.sizeId)} />
                </div>
                <Space style={{ marginTop: 12 }}>
                  <Button icon={<MinusOutlined />} onClick={() => onQuantityChange(item.productId, item.sizeId, Math.max(1, item.quantity - 1))} />
                  <Typography.Text strong>{item.quantity}</Typography.Text>
                  <Button icon={<PlusOutlined />} onClick={() => onQuantityChange(item.productId, item.sizeId, item.quantity + 1)} />
                </Space>
              </div>
            ))}
          </div>
        )}

        <Input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} placeholder="Customer name" size="large" />
        <Select value={paymentMethod} onChange={onPaymentMethodChange} options={PAYMENT_OPTIONS} size="large" />
        <Input type="number" min={0} value={taxPct} onChange={(event) => onTaxChange(Number(event.target.value || 0))} placeholder="Tax %" size="large" />

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text type="secondary">Subtotal</Typography.Text>
            <Typography.Text>Rs {subtotal.toFixed(2)}</Typography.Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text type="secondary">Tax</Typography.Text>
            <Typography.Text>Rs {taxAmount.toFixed(2)}</Typography.Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography.Text strong>Total</Typography.Text>
            <Typography.Text strong>Rs {total.toFixed(2)}</Typography.Text>
          </div>
        </div>

        <Button type="primary" size="large" icon={<ShoppingCartOutlined />} disabled={items.length === 0} loading={checkoutLoading} onClick={onCheckout}>
          Checkout
        </Button>
      </div>
    </Drawer>
  );
}
