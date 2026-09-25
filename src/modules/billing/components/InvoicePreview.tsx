"use client";

import { Alert, App, Button, Modal, Select, Table, Typography } from "antd";
import { PrinterOutlined, CheckCircleFilled, CloseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ReturnTransactionItem, Sale, SaleItem } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import { useEffect, useState } from "react";
import { buildInvoiceDocumentHtml } from "../invoiceDocument";
import type { WhatsAppInvoiceSelection } from "../types";
import { WhatsAppInvoiceSelector } from "@/modules/whatsapp/components/WhatsAppInvoiceSelector";
import {
  InvoiceHeader,
  SuccessRow,
  SuccessIconCircle,
  SuccessTextWrap,
  SuccessTitle,
  SuccessSubtext,
  InvoiceNumBadge,
  MetaPills,
  MetaPill,
  PillLabel,
  PartiesRow,
  Party,
  PartyLabel,
  PartyName,
  PartyDetail,
  SectionLabel,
  TableWrap,
  ItemNameCell,
  ItemSkuCell,
  SizeBadge,
  AttrBadge,
  SummaryCard,
  SumRow,
  TotalSumRow,
  NewSaleBanner,
  NewSaleBannerText,
  NewSaleBtn,
  FooterActions,
  ActionButton,
  PrintButton,
  InvoiceBodyContent,
  DiscountText,
} from "./InvoicePreview.styled";

interface InvoicePreviewProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

const { Text } = Typography;

const InvoicePreview = ({ sale, open, onClose }: InvoicePreviewProps) => {
  const { storeName, storeId } = useStore();
  const { message } = App.useApp();
  const [whatsappInvoice, setWhatsappInvoice] = useState<WhatsAppInvoiceSelection>({ enabled: false });
  const [invoiceTarget, setInvoiceTarget] = useState("SALE");
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [latestInvoiceAttempt, setLatestInvoiceAttempt] = useState<{
    id: string;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    templateInstance?: { metaTemplateName: string } | null;
  } | null>(null);

  useEffect(() => {
    setInvoiceTarget("SALE");
    setWhatsappInvoice({ enabled: false, recipient: sale?.customerPhone ?? undefined });
  }, [sale?.id, sale?.customerPhone]);

  useEffect(() => {
    if (!open || !sale) return;
    const kind = invoiceTarget === "SALE" ? "SALE" : "EXCHANGE";
    const transactionId = invoiceTarget === "SALE" ? sale.id : invoiceTarget;
    const controller = new AbortController();
    fetch(`/api/whatsapp/invoices?kind=${kind}&transactionId=${encodeURIComponent(transactionId)}`, {
      cache: "no-store",
      headers: { "x-request-id": crypto.randomUUID() },
      signal: controller.signal,
    })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((body: { attempts?: Array<typeof latestInvoiceAttempt> }) => setLatestInvoiceAttempt(body.attempts?.[0] ?? null))
      .catch(error => {
        if (!(error instanceof Error && error.name === "AbortError")) setLatestInvoiceAttempt(null);
      });
    return () => controller.abort();
  }, [open, sale, invoiceTarget]);

  if (!sale) return null;

  const round2 = (value: number) => Math.round(value * 100) / 100;

  const getItemSnapshot = (item: SaleItem) => {
    const unitMrp = Number(item.originalUnitPrice ?? item.mrp ?? item.unitPrice);
    const finalUnitPrice = item.finalUnitPrice != null
      ? Number(item.finalUnitPrice)
      : item.sellingPrice != null
        ? Number(item.sellingPrice)
        : Number(item.unitPrice);
    const lineTotal = item.finalLineAmount != null ? Number(item.finalLineAmount) : Number(item.total);
    const mrpLineTotal = round2(unitMrp * item.quantity);
    const savings = Math.max(0, round2(mrpLineTotal - lineTotal));
    const discountPercent = unitMrp > 0 ? Math.round(((unitMrp - finalUnitPrice) / unitMrp) * 100) : 0;

    return { unitMrp, finalUnitPrice, lineTotal, mrpLineTotal, savings, discountPercent };
  };

  const getHistoryItemDisplay = (item: ReturnTransactionItem) => {
    const productName = item.productName?.trim();
    const productId = item.productId?.trim();
    const sku = item.sku?.trim();
    const sizeLabel = item.sizeLabel?.trim();
    const sizeId = item.sizeId?.trim();
    const primary = productName || sku || productId || "Product";
    const secondaryParts = [sku, productId].filter(
      (value): value is string => Boolean(value && value !== primary)
    );

    return {
      primary,
      secondary: secondaryParts.join(" · "),
      size: sizeLabel || sizeId,
    };
  };

  const mrpSubtotal = round2(sale.items.reduce((sum, item) => sum + Number(item.originalUnitPrice ?? item.mrp ?? item.unitPrice) * item.quantity, 0));
  const invoiceSubtotal = sale.items.every((item) => item.netLineAmount != null)
    ? round2(sale.items.reduce((sum, item) => sum + Number(item.taxableAmount ?? 0), 0) + sale.discountAmount)
    : sale.subtotal;
  const totalSavings = Math.max(0, round2(mrpSubtotal - Number(sale.total)));

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(buildInvoiceDocumentHtml({
      sale,
      merchant: { name: storeName },
      kind: invoiceTarget === "SALE" ? "SALE" : "EXCHANGE",
      returnTransactionId: invoiceTarget === "SALE" ? undefined : invoiceTarget,
      configuration: invoiceTarget === "SALE"
        ? sale.invoiceSnapshot
        : sale.returnTransactions.find(item => item.id === invoiceTarget)?.invoiceSnapshot,
    }));
    printWindow.document.close();
    printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  };

  const sendFromHistory = async () => {
    if (!storeId || !whatsappInvoice.recipient || !whatsappInvoice.consentConfirmed) {
      message.error("Confirm the invoice recipient first.");
      return;
    }
    const [kind, transactionId] = invoiceTarget === "SALE"
      ? ["SALE", sale.id]
      : ["EXCHANGE", invoiceTarget];
    const submit = async () => {
      const requestId = crypto.randomUUID();
      setSendingInvoice(true);
      try {
        const response = await fetch("/api/whatsapp/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-request-id": requestId },
          body: JSON.stringify({ kind, transactionId, storeId, recipient: whatsappInvoice.recipient, consentConfirmed: true }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Invoice could not be queued");
        setLatestInvoiceAttempt({ id: body.id, status: body.status, errorCode: body.errorCode, errorMessage: body.errorMessage });
        if (body.status === "FAILED") message.warning("Invoice attempt was recorded but Meta submission failed. Review the failure before resending.");
        else message.success("Invoice submitted to Meta. Delivery will update asynchronously.");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Invoice could not be sent");
      } finally {
        setSendingInvoice(false);
      }
    };
    let previous: { attempts: unknown[] };
    try {
      const response = await fetch(`/api/whatsapp/invoices?kind=${kind}&transactionId=${encodeURIComponent(transactionId)}`, { cache: "no-store", headers: { "x-request-id": crypto.randomUUID() } });
      if (!response.ok) throw new Error();
      previous = await response.json() as { attempts: unknown[] };
    } catch {
      message.error("Previous invoice attempts could not be checked. Nothing was sent.");
      return;
    }
    if (previous.attempts.length) {
      Modal.confirm({ title: "Resend invoice?", content: "A tracked WhatsApp attempt already exists for this transaction. This creates a separate resend attempt.", okText: "Resend", onOk: submit });
    } else await submit();
  };

  const columns: ColumnsType<SaleItem> = [
    {
      title: "#",
      width: 40,
      render: (_, __, index) => (
        <Text type="secondary">{index + 1}</Text>
      ),
    },
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <>
          <ItemNameCell>{record.productName}</ItemNameCell>
          <ItemSkuCell>
            {record.sku}
            <SizeBadge>{record.sizeLabel}</SizeBadge>
            {Object.values(record.attributes)
              .filter((v) => {
                const s = String(v).trim().toLowerCase();
                return s !== "" && !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(s);
              })
              .map((v, i) => (
                <AttrBadge key={i}>{String(v)}</AttrBadge>
              ))}
          </ItemSkuCell>
        </>
      ),
    },
    {
      title: "Price (excl. tax)",
      dataIndex: "unitPrice",
      width: 140,
      align: "right",
      render: (_price: number, record) => {
        const { unitMrp, finalUnitPrice, savings, discountPercent } = getItemSnapshot(record);
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <Text strong>{formatCurrency(finalUnitPrice)}</Text>
            {record.originalUnitPrice != null && <Text type="secondary" style={{ fontSize: 12 }}>
              Agreed {formatCurrency(record.sellingPrice ?? record.unitPrice)} / unit
            </Text>}
            {unitMrp > finalUnitPrice && (
              <>
                <Text delete type="secondary" style={{ fontSize: 12 }}>
                  {formatCurrency(unitMrp)}
                </Text>
                <DiscountText>{discountPercent}% OFF{ savings > 0 ? ` • Save ${formatCurrency(savings)}` : "" }</DiscountText>
              </>
            )}
          </div>
        );
      },
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 60,
      align: "center",
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: "Total (excl. tax)",
      dataIndex: "total",
      width: 100,
      align: "right",
      render: (_total: number, record) => <Text strong>{formatCurrency(record.finalLineAmount ?? record.total)}</Text>,
    },
  ];

  const historyColumns: ColumnsType<ReturnTransactionItem> = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => {
        const product = getHistoryItemDisplay(record);

        return (
          <>
            <ItemNameCell>{product.primary}</ItemNameCell>
            <ItemSkuCell>
              {product.secondary}
              {product.size && <SizeBadge>{product.size}</SizeBadge>}
            </ItemSkuCell>
          </>
        );
      },
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 60,
      align: "center",
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 100,
      align: "right",
      render: (_total: number, record) => <Text strong>{formatCurrency(record.total)}</Text>,
    },
  ];

  const isCompleted = sale.status === "COMPLETED";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={660}
      footer={null}
      title={null}
      closeIcon={<CloseOutlined />}
      styles={{ body: { padding: 0 } }}
    >
      {/* Gradient header */}
      <InvoiceHeader>
        <SuccessRow>
          <SuccessIconCircle>
            <CheckCircleFilled />
          </SuccessIconCircle>
          <SuccessTextWrap>
            <SuccessTitle>Sale {isCompleted ? "Complete" : "Voided"}</SuccessTitle>
            <SuccessSubtext>
              {dayjs(sale.transactionDate).format("DD MMM YYYY · hh:mm A")}
            </SuccessSubtext>
          </SuccessTextWrap>
          <InvoiceNumBadge>{sale.invoiceNumber}</InvoiceNumBadge>
        </SuccessRow>
        <MetaPills>
          <MetaPill>
            <PillLabel>Payment</PillLabel>
            {sale.paymentMethod}
          </MetaPill>
          <MetaPill>
            <PillLabel>Payment status</PillLabel>
            {sale.paymentStatus}
          </MetaPill>
          <MetaPill $green={isCompleted}>
            <PillLabel>Status</PillLabel>
            {sale.status}
          </MetaPill>
          <MetaPill>
            <PillLabel>Items</PillLabel>
            {sale.items.reduce((s, i) => s + i.quantity, 0)}
          </MetaPill>
        </MetaPills>
      </InvoiceHeader>

      {/* Body */}
      <InvoiceBodyContent>
        {/* Parties */}
        <PartiesRow>
          <Party>
            <PartyLabel>From</PartyLabel>
            <PartyName>{storeName}</PartyName>
            <PartyDetail>Point of Sale</PartyDetail>
          </Party>
          {(sale.customerName || sale.customerPhone) && (
            <Party $right>
              <PartyLabel>Customer</PartyLabel>
              {sale.customerName && <PartyName>{sale.customerName}</PartyName>}
              {sale.customerPhone && <PartyDetail>{sale.customerPhone}</PartyDetail>}
            </Party>
          )}
        </PartiesRow>

        {/* Items */}
        <div>
          <SectionLabel>Items Purchased</SectionLabel>
          <TableWrap>
            <Table
              columns={columns}
              dataSource={sale.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </TableWrap>
        </div>

        {/* Summary */}
        <SummaryCard>
          <SumRow>
            <span>Subtotal (before bill discount, excl. tax)</span>
            <span>{formatCurrency(invoiceSubtotal)}</span>
          </SumRow>
          {sale.discountAmount > 0 && (
            <SumRow>
              <DiscountText>Discount</DiscountText>
              <DiscountText>−{formatCurrency(sale.discountAmount)}</DiscountText>
            </SumRow>
          )}
          {totalSavings > 0 && (
            <SumRow>
              <DiscountText>You Saved</DiscountText>
              <DiscountText>{formatCurrency(totalSavings)}</DiscountText>
            </SumRow>
          )}
          {sale.taxAmount > 0 && (
            <SumRow>
              <span>Tax</span>
              <span>{formatCurrency(sale.taxAmount)}</span>
            </SumRow>
          )}
          {sale.calculatedTotal != null && (
            <SumRow>
              <span>Calculated Total</span>
              <span>{formatCurrency(sale.calculatedTotal)}</span>
            </SumRow>
          )}
          {sale.roundOffAmount !== 0 && (
            <SumRow>
              <span>Round Off</span>
              <span>{sale.roundOffAmount > 0 ? '+' : ''}{formatCurrency(sale.roundOffAmount)}</span>
            </SumRow>
          )}
          <SumRow>
            <span>Amount paid</span>
            <span>{formatCurrency(sale.amountPaid)}</span>
          </SumRow>
          {sale.amountDue > 0 && (
            <SumRow>
              <DiscountText>Amount due</DiscountText>
              <DiscountText>{formatCurrency(sale.amountDue)}</DiscountText>
            </SumRow>
          )}
          <TotalSumRow>
            <span>Final Payable</span>
            <span>{formatCurrency(sale.total)}</span>
          </TotalSumRow>
        </SummaryCard>

        {sale.returnTransactions.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <SectionLabel>Return / Exchange history</SectionLabel>
            {sale.returnTransactions.map((transaction) => (
              <div
                key={transaction.id}
                style={{
                  border: "1px solid #e8e8e8",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div>
                    <Text strong>{transaction.type}</Text>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{dayjs(transaction.createdAt).format("DD MMM YYYY · hh:mm A")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Text type="secondary">Refund</Text>
                    <div>{formatCurrency(transaction.refundAmount)}</div>
                    <Text type="secondary">Offset</Text>
                    <div>{formatCurrency(transaction.offsetAmount)}</div>
                  </div>
                </div>
                {transaction.returnedItems.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Returned items</Text>
                    <Table
                      columns={historyColumns}
                      dataSource={transaction.returnedItems}
                      rowKey={(item) => `${item.productId}-${item.sizeId}-returned`}
                      pagination={false}
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  </div>
                )}
                {transaction.exchangedItems.length > 0 && (
                  <div>
                    <Text strong>Exchanged items</Text>
                    <Table
                      columns={historyColumns}
                      dataSource={transaction.exchangedItems}
                      rowKey={(item) => `${item.productId}-${item.sizeId}-exchanged`}
                      pagination={false}
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New sale banner */}
        {isCompleted && (
          <NewSaleBanner>
            <span>🎉</span>
            <NewSaleBannerText>Transaction recorded successfully!</NewSaleBannerText>
            <NewSaleBtn onClick={onClose}>New Sale</NewSaleBtn>
          </NewSaleBanner>
        )}

        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {sale.returnTransactions.length ? (
            <Select
              value={invoiceTarget}
              onChange={setInvoiceTarget}
              options={[
                { value: "SALE", label: `Purchase invoice ${sale.invoiceNumber}` },
                ...sale.returnTransactions.map(transaction => ({ value: transaction.id, label: `${transaction.type} ${transaction.referenceNumber || transaction.id.slice(0, 8)}` })),
              ]}
            />
          ) : null}
          <WhatsAppInvoiceSelector storeId={storeId} recipient={sale.customerPhone ?? ""} value={whatsappInvoice} onChange={setWhatsappInvoice} transactionKind={invoiceTarget === "SALE" ? "SALE" : "EXCHANGE"} />
          {latestInvoiceAttempt ? (
            <Alert
              type={latestInvoiceAttempt.status === "FAILED" ? "error" : latestInvoiceAttempt.status === "DELIVERED" || latestInvoiceAttempt.status === "READ" ? "success" : "info"}
              showIcon
              message={`Latest WhatsApp invoice: ${latestInvoiceAttempt.status}`}
              description={latestInvoiceAttempt.status === "FAILED"
                ? `${latestInvoiceAttempt.errorCode || "INVOICE_DELIVERY_FAILED"}${latestInvoiceAttempt.errorMessage ? ` — ${latestInvoiceAttempt.errorMessage}` : ""}`
                : latestInvoiceAttempt.templateInstance?.metaTemplateName
                  ? `Template: ${latestInvoiceAttempt.templateInstance.metaTemplateName}`
                  : undefined}
            />
          ) : null}
          {whatsappInvoice.enabled ? <Button type="primary" loading={sendingInvoice} onClick={() => void sendFromHistory()}>Send / resend finalized PDF</Button> : null}
        </div>

        {/* Footer actions */}
        <FooterActions>
          <ActionButton onClick={onClose}>
            <CloseOutlined />
            Close
          </ActionButton>
          <PrintButton type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Invoice
          </PrintButton>
        </FooterActions>
      </InvoiceBodyContent>
    </Modal>
  );
}

export default InvoicePreview;
