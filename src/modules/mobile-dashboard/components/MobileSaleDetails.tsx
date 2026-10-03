"use client";

import { ArrowLeftOutlined, SwapOutlined } from "@ant-design/icons";
import { Button, Drawer, Skeleton, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import CollectPaymentSection from "@/modules/billing/components/CollectPaymentSection";
import PaymentHistorySection from "@/modules/billing/components/PaymentHistorySection";
import type { PaymentMethodType, Sale } from "@/modules/billing/types";
import { getHistoricalUnitAmount } from "@/modules/billing/utils/saleCompatibility";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./MobileSaleDetails.module.css";

const EXCHANGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type Props = {
  open: boolean;
  loading: boolean;
  sale: Sale | null;
  onClose: () => void;
  onOpenExchange: (saleId: string) => void;
  onCollectPayment: (
    saleId: string,
    amount: number,
    method: PaymentMethodType,
    splitPayments?: Array<{ method: PaymentMethodType; amount: number }>,
    note?: string
  ) => Promise<unknown>;
  onReload: (saleId: string) => Promise<void>;
};

function DetailRow({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong className={strong ? styles.emphasis : undefined}>{value}</strong>
    </div>
  );
}

export function MobileSaleDetails({
  open,
  loading,
  sale,
  onClose,
  onOpenExchange,
  onCollectPayment,
  onReload,
}: Props) {
  const [eligibilityReferenceTime] = useState(() => Date.now());
  const exchangeEligible = Boolean(
    sale?.status === "COMPLETED"
      && eligibilityReferenceTime - new Date(sale.createdAt).getTime() <= EXCHANGE_WINDOW_MS
  );

  return (
    <Drawer
      open={open}
      placement="bottom"
      height="94dvh"
      title={sale ? `Sale ${sale.invoiceNumber}` : "Sale details"}
      closeIcon={<ArrowLeftOutlined />}
      onClose={onClose}
      className={styles.drawer}
      styles={{ body: { padding: 0 }, header: { padding: "14px 16px" } }}
    >
      {loading ? (
        <div className={styles.loading}><Skeleton active paragraph={{ rows: 8 }} /></div>
      ) : sale ? (
        <div className={styles.content}>
          <section className={styles.hero}>
            <div>
              <Typography.Text className={styles.eyebrow}>Amount</Typography.Text>
              <div className={styles.total}>{formatCurrency(sale.finalPayableAmount ?? sale.total)}</div>
              <Typography.Text type="secondary">
                {dayjs(sale.transactionDate ?? sale.createdAt).format("DD MMM YYYY, h:mm A")}
              </Typography.Text>
            </div>
            <Tag color={sale.paymentStatus === "PAID" ? "green" : sale.paymentStatus === "PARTIAL" ? "orange" : "red"}>
              {sale.paymentStatus}
            </Tag>
          </section>

          <section className={styles.section}>
            <h2>Customer</h2>
            <DetailRow label="Name" value={sale.customerName || "Walk-in customer"} />
            <DetailRow label="Mobile" value={sale.customerPhone || "—"} />
            {sale.customerEmail ? <DetailRow label="Email" value={sale.customerEmail} /> : null}
          </section>

          <section className={styles.section}>
            <h2>Items</h2>
            <div className={styles.itemList}>
              {sale.items.map((item) => (
                <div className={styles.item} key={item.id}>
                  <div className={styles.itemTop}>
                    <div className={styles.itemIdentity}>
                      <strong>{item.productName}</strong>
                      <span>{item.sku} · {item.sizeLabel}</span>
                    </div>
                    <strong>{formatCurrency(item.finalLineAmount ?? item.total)}</strong>
                  </div>
                  <span className={styles.itemMeta}>{item.quantity} × {formatCurrency(getHistoricalUnitAmount(item))}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2>Payment summary</h2>
            <DetailRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
            <DetailRow label="Discount" value={`−${formatCurrency(sale.discountAmount)}`} />
            <DetailRow label="Tax" value={formatCurrency(sale.taxAmount)} />
            {sale.roundOffAmount ? <DetailRow label="Round off" value={formatCurrency(sale.roundOffAmount)} /> : null}
            <DetailRow label="Paid" value={formatCurrency(sale.amountPaid)} />
            <DetailRow label="Balance due" value={formatCurrency(sale.amountDue)} strong={sale.amountDue > 0} />
            <DetailRow label="Payment method" value={sale.paymentMethod} />
          </section>

          {sale.payments?.length ? (
            <section className={styles.section}>
              <PaymentHistorySection
                paymentHistory={sale.payments}
                amountPaid={sale.amountPaid}
                amountDue={sale.amountDue}
              />
            </section>
          ) : null}

          {sale.amountDue > 0 ? (
            <section className={styles.section}>
              <CollectPaymentSection
                saleId={sale.id}
                amountDue={sale.amountDue}
                amountPaid={sale.amountPaid}
                paymentHistory={sale.payments ?? []}
                defaultMethod={sale.paymentMethod === "SPLIT" ? "CASH" : sale.paymentMethod}
                onCollectPayment={onCollectPayment}
                onPaymentCollected={() => void onReload(sale.id)}
              />
            </section>
          ) : null}

          {exchangeEligible ? (
            <div className={styles.stickyAction}>
              <Button type="primary" size="large" block icon={<SwapOutlined />} onClick={() => onOpenExchange(sale.id)}>
                Return / exchange items
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.loading}>Sale details could not be loaded.</div>
      )}
    </Drawer>
  );
}
