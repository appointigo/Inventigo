"use client";

import { Modal, Table, Typography } from "antd";
import { PrinterOutlined, CheckCircleFilled, CloseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ReturnTransactionItem, Sale, SaleItem } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";
import { useStore } from "@/providers/StoreProvider";
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
  const { storeName } = useStore();

  if (!sale) return null;

  const round2 = (value: number) => Math.round(value * 100) / 100;

  const getItemSnapshot = (item: SaleItem) => {
    const unitMrp = item.mrp != null ? Number(item.mrp) : Number(item.unitPrice);
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

  const mrpSubtotal = round2(sale.items.reduce((sum, item) => sum + ((item.mrp != null ? Number(item.mrp) : Number(item.unitPrice)) * item.quantity), 0));
  const totalSavings = Math.max(0, round2(mrpSubtotal - Number(sale.total)));

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemRows = sale.items
      .map((item, i) => {
        const { unitMrp, finalUnitPrice, lineTotal, savings, discountPercent } = getItemSnapshot(item);
        const attrValues = Object.values(item.attributes ?? {})
          .filter((v) => {
            const s = String(v).trim().toLowerCase();
            return s !== "" && !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(s);
          })
          .map((v) => `<span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;font-size:9pt;padding:0 5px;margin-left:3px;">${String(v)}</span>`)
          .join("");

        return `
          <tr>
            <td>${i + 1}</td>
            <td>
              <div style="font-weight:700;margin-bottom:4px;">${item.productName}</div>
              <div style="font-size:10pt;color:#666;line-height:1.4;">
                ${item.sku} · ${item.sizeLabel}${attrValues}
              </div>
              <div style="margin-top:6px;font-size:10pt;color:#111;">
                <span style="font-weight:700;">${formatCurrency(finalUnitPrice)}</span>
                ${unitMrp > finalUnitPrice ? `<span style="margin-left:8px;text-decoration:line-through;color:#888;">${formatCurrency(unitMrp)}</span>` : ""}
              </div>
              ${unitMrp > finalUnitPrice ? `<div style="font-size:10pt;color:#15803d;">${discountPercent}% OFF${savings > 0 ? ` • Save ${formatCurrency(savings)}` : ""}</div>` : ""}
            </td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${formatCurrency(lineTotal)}</td>
          </tr>
        `;
      })
      .join("");

    const historySections = sale.returnTransactions.length
      ? sale.returnTransactions
          .map((transaction) => {
            const returnedRows = (transaction.returnedItems ?? [])
              .map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.productName ?? item.productId}<br><small style="color:#888">${item.sku ?? item.productId} · <span style="display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;">${item.sizeLabel ?? item.sizeId}</span></small></td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:right">${formatCurrency(item.total)}</td>
                </tr>
              `)
              .join("");

            const exchangedRows = (transaction.exchangedItems ?? [])
              .map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.productName ?? item.productId}<br><small style="color:#888">${item.sku ?? item.productId} · <span style="display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;">${item.sizeLabel ?? item.sizeId}</span></small></td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:right">${formatCurrency(item.total)}</td>
                </tr>
              `)
              .join("");

            return `
              <div style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:8px;">
                <div style="font-weight:700; margin-bottom:8px;">${transaction.type} · ${dayjs(transaction.createdAt).format("DD MMM YYYY, hh:mm A")}</div>
                ${returnedRows ? `
                  <div style="margin-bottom:12px;">
                    <div style="font-weight:600; margin-bottom:6px;">Returned items</div>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:0;">
                      <thead>
                        <tr>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">#</th>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">Product</th>
                          <th style="text-align:center; padding:4px; border-bottom:1px solid #ddd;">Qty</th>
                          <th style="text-align:right; padding:4px; border-bottom:1px solid #ddd;">Total</th>
                        </tr>
                      </thead>
                      <tbody>${returnedRows}</tbody>
                    </table>
                  </div>
                ` : ""}
                ${exchangedRows ? `
                  <div>
                    <div style="font-weight:600; margin-bottom:6px;">Exchanged items</div>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:0;">
                      <thead>
                        <tr>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">#</th>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">Product</th>
                          <th style="text-align:center; padding:4px; border-bottom:1px solid #ddd;">Qty</th>
                          <th style="text-align:right; padding:4px; border-bottom:1px solid #ddd;">Total</th>
                        </tr>
                      </thead>
                      <tbody>${exchangedRows}</tbody>
                    </table>
                  </div>
                ` : ""}
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:12px; font-size:11pt;">
                  <div>Refund: ${formatCurrency(transaction.refundAmount)}</div>
                  <div>Offset: ${formatCurrency(transaction.offsetAmount)}</div>
                </div>
              </div>
            `;
          })
          .join("")
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${sale.invoiceNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12pt; color: #333; padding: 20px; }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { font-size: 20pt; margin-bottom: 4px; }
            .header p { color: #666; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info div { font-size: 10pt; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            .totals { text-align: right; }
            .totals div { margin-bottom: 4px; }
            .grand-total { font-size: 14pt; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }
            .footer { text-align: center; margin-top: 40px; font-size: 10pt; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${storeName}</h1>
            <p>Tax Invoice</p>
          </div>
          <div class="info">
            <div>
              <strong>Invoice:</strong> ${sale.invoiceNumber}<br>
              <strong>Date:</strong> ${dayjs(sale.transactionDate).format("DD MMM YYYY, hh:mm A")}<br>
              <strong>Payment:</strong> ${sale.paymentMethod}<br>
              <strong>Payment status:</strong> ${sale.paymentStatus}
            </div>
            <div style="text-align:right">
              ${sale.customerName ? `<strong>Customer:</strong> ${sale.customerName}<br>` : ""}
              ${sale.customerPhone ? `<strong>Phone:</strong> ${sale.customerPhone}<br>` : ""}
              <strong>Status:</strong> ${sale.status}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th style="text-align:right">Price</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          ${historySections}
          <div class="totals">
            <div>Subtotal (MRP): ${formatCurrency(mrpSubtotal)}</div>
            ${sale.discountAmount > 0 ? `<div>Discount: -${formatCurrency(sale.discountAmount)}</div>` : ""}
            ${totalSavings > 0 ? `<div>You Saved: ${formatCurrency(totalSavings)}</div>` : ""}
            ${sale.taxAmount > 0 ? `<div>Tax: ${formatCurrency(sale.taxAmount)}</div>` : ""}
            <div>Amount paid: ${formatCurrency(sale.amountPaid)}</div>
            ${sale.amountDue > 0 ? `<div>Amount due: ${formatCurrency(sale.amountDue)}</div>` : ""}
            <div class="grand-total">Final Total: ${formatCurrency(sale.total)}</div>
          </div>
          <div class="footer">Thank you for your purchase!</div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      title: "Price",
      dataIndex: "unitPrice",
      width: 140,
      align: "right",
      render: (_price: number, record) => {
        const { unitMrp, finalUnitPrice, savings, discountPercent } = getItemSnapshot(record);
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <Text strong>{formatCurrency(finalUnitPrice)}</Text>
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
      title: "Total",
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
      render: (_, record) => (
        <>
          <ItemNameCell>{record.productName ?? record.productId}</ItemNameCell>
          <ItemSkuCell>
            {record.sku ?? record.productId}
            <SizeBadge>{record.sizeLabel ?? record.sizeId}</SizeBadge>
          </ItemSkuCell>
        </>
      ),
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
            <span>Subtotal (MRP)</span>
            <span>{formatCurrency(mrpSubtotal)}</span>
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