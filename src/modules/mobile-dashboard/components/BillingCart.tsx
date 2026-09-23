"use client";

import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button, DatePicker, Drawer, Empty, Input, Typography } from "antd";
import dayjs from "dayjs";
import type { CartItem, PaymentMethodType, SplitPaymentEntry } from "@/modules/billing/types";
import type { WhatsAppInvoiceSelection } from "@/modules/billing/types";
import { WhatsAppInvoiceSelector } from "@/modules/whatsapp/components/WhatsAppInvoiceSelector";
import { ItemPriceEditor, type UpdateItemPricing } from "@/modules/billing/components/ItemPriceEditor";
import { allocatePricingSnapshots } from "@/modules/billing/utils/pricingEngine";
import { SplitPaymentPanel } from "./SplitPaymentPanel";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./BillingCart.module.css";

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
  splitMode,
  onSplitModeChange,
  splitPayments,
  onSplitPaymentsChange,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerEmail,
  onCustomerEmailChange,
  customerStats,
  customerLoading,
  onQuantityChange,
  onItemPricingChange,
  onRemove,
  onCheckout,
  checkoutLoading,
  transactionDate,
  onTransactionDateChange,
  storeId,
  whatsappInvoice,
  onWhatsAppInvoiceChange,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onItemPricingChange: UpdateItemPricing;
  subtotal: number;
  taxPct: number;
  onTaxChange: (value: number) => void;
  paymentMethod: PaymentMethodType;
  onPaymentMethodChange: (value: PaymentMethodType) => void;
  splitMode: boolean;
  onSplitModeChange: (value: boolean) => void;
  splitPayments: SplitPaymentEntry[];
  onSplitPaymentsChange: (entries: SplitPaymentEntry[]) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (value: string) => void;
  customerStats?: { totalVisits: number; totalSpend: number; lastPurchaseDate: string | null } | null;
  customerLoading?: boolean;
  onQuantityChange: (productId: string, sizeId: string, quantity: number) => void;
  onRemove: (productId: string, sizeId: string) => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
  transactionDate: string;
  onTransactionDateChange: (value: string) => void;
  storeId?: string | null;
  whatsappInvoice: WhatsAppInvoiceSelection;
  onWhatsAppInvoiceChange: (value: WhatsAppInvoiceSelection) => void;
}) {
  const pricing = allocatePricingSnapshots(items.map((item) => ({ productId: item.productId, quantity: item.quantity, mrp: item.originalUnitPrice ?? item.unitPrice, sellingPrice: item.unitPrice })), { taxRate: taxPct });
  const taxAmount = pricing.taxAmount;
  const total = Math.round(pricing.total);
  const splitTotal = splitPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const splitMatchesTotal = Math.abs(splitTotal - total) < 0.01;

  return (
    <Drawer title="Billing Cart" placement="right" open={open} onClose={onClose} size="min(420px, 100vw)" destroyOnHidden className={styles.drawer}>
      <div className={styles.content}>
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items in cart" />
        ) : (
          <div className={styles.items}>
            {items.map((item) => (
              <div key={`${item.productId}-${item.sizeId}`} className={styles.item}>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <Typography.Text strong>{item.productName}</Typography.Text>
                    <div style={{ color: "#64748b", marginTop: 4 }}>{item.sizeLabel}</div>
                    <div className={styles.unitPrice}>{formatCurrency(item.unitPrice)} / unit</div>
                  </div>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(item.productId, item.sizeId)} />
                </div>
                <ItemPriceEditor item={item} onChange={onItemPricingChange} />
                <div className={styles.quantityRow}>
                  <div className={styles.quantityControl}>
                    <Button aria-label={`Decrease ${item.productName} quantity`} icon={<MinusOutlined />} onClick={() => onQuantityChange(item.productId, item.sizeId, Math.max(1, item.quantity - 1))} />
                    <Typography.Text strong>{item.quantity}</Typography.Text>
                    <Button aria-label={`Increase ${item.productName} quantity`} icon={<PlusOutlined />} onClick={() => onQuantityChange(item.productId, item.sizeId, item.quantity + 1)} />
                  </div>
                  <Typography.Text strong>{formatCurrency(item.unitPrice * item.quantity)}</Typography.Text>
                </div>
              </div>
            ))}
          </div>
        )}

        <Input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} placeholder="Customer name" size="large" />
        <Input value={customerPhone} onChange={(event) => onCustomerPhoneChange(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Customer mobile" size="large" />
        <Input value={customerEmail} onChange={(event) => onCustomerEmailChange(event.target.value)} placeholder="Customer email (optional)" size="large" />

        <WhatsAppInvoiceSelector
          storeId={storeId}
          recipient={customerPhone}
          value={whatsappInvoice}
          onChange={onWhatsAppInvoiceChange}
        />

        <div>
          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>Transaction Date</Typography.Text>
          <DatePicker
            value={dayjs(transactionDate)}
            onChange={(date) => onTransactionDateChange(date?.format('YYYY-MM-DD') ?? '')}
            disabledDate={(current) => current && current.isAfter(dayjs().endOf('day'))}
            style={{ width: '100%' }}
            size="large"
          />
        </div>

        {(customerLoading || customerStats) ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#f8fafc" }}>
            <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>Customer Stats</Typography.Text>
            {customerLoading ? (
              <Typography.Text type="secondary">Loading customer details...</Typography.Text>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography.Text type="secondary">Total visits</Typography.Text>
                  <Typography.Text>{customerStats?.totalVisits ?? 0}</Typography.Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography.Text type="secondary">Total spend</Typography.Text>
                  <Typography.Text>{formatCurrency(customerStats?.totalSpend ?? 0)}</Typography.Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography.Text type="secondary">Last purchase</Typography.Text>
                  <Typography.Text>
                    {customerStats?.lastPurchaseDate
                      ? new Date(customerStats.lastPurchaseDate).toLocaleDateString("en-IN")
                      : "-"}
                  </Typography.Text>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <Typography.Text strong style={{ display: "block" }}>Payment Method</Typography.Text>
          <div className={styles.paymentGrid}>
            {PAYMENT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type={!splitMode && paymentMethod === option.value ? "primary" : "default"}
                onClick={() => {
                  onSplitModeChange(false);
                  onPaymentMethodChange(option.value);
                }}
              >
                {option.label}
              </Button>
            ))}
            <Button
              type={splitMode ? "primary" : "default"}
              onClick={() => onSplitModeChange(true)}
            >
              Split
            </Button>
          </div>
        </div>

        {splitMode ? (
          <SplitPaymentPanel
            entries={splitPayments}
            totalDue={total}
            onEntriesChange={onSplitPaymentsChange}
          />
        ) : null}
        <Input type="number" min={0} value={taxPct} onChange={(event) => onTaxChange(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} placeholder="Tax %" size="large" />

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text type="secondary">Subtotal</Typography.Text>
            <Typography.Text>{formatCurrency(subtotal)}</Typography.Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text type="secondary">Tax</Typography.Text>
            <Typography.Text>{formatCurrency(taxAmount)}</Typography.Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography.Text strong>Total</Typography.Text>
            <Typography.Text strong>{formatCurrency(total)}</Typography.Text>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<ShoppingCartOutlined />}
          disabled={items.length === 0 || (splitMode && !splitMatchesTotal)}
          loading={checkoutLoading}
          onClick={onCheckout}
          className={styles.checkout}
        >
          Checkout
        </Button>

        {splitMode && !splitMatchesTotal ? (
          <Typography.Text type="danger" style={{ fontSize: 12, textAlign: "center" }}>
            Split amount must exactly match total amount
          </Typography.Text>
        ) : null}
      </div>
    </Drawer>
  );
}
