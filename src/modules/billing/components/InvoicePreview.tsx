"use client";

import { Modal, Table, Typography } from "antd";
import { PrinterOutlined, CheckCircleFilled, CloseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Sale, SaleItem } from "../types";
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemRows = sale.items
      .map((item, i) => {
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
            <td>${item.productName}<br><small style="color:#888">${item.sku} · <span style="display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;">${item.sizeLabel}</span>${attrValues}</small></td>
            <td style="text-align:right">${formatCurrency(item.unitPrice)}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${formatCurrency(item.total)}</td>
          </tr>
        `;
      })
      .join("");

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
              <strong>Date:</strong> ${dayjs(sale.createdAt).format("DD MMM YYYY, hh:mm A")}<br>
              <strong>Payment:</strong> ${sale.paymentMethod}
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
          <div class="totals">
            <div>Subtotal: ${formatCurrency(sale.subtotal)}</div>
            ${sale.discountAmount > 0 ? `<div>Discount: -${formatCurrency(sale.discountAmount)}</div>` : ""}
            ${sale.taxAmount > 0 ? `<div>Tax: ${formatCurrency(sale.taxAmount)}</div>` : ""}
            <div class="grand-total">Total: ${formatCurrency(sale.total)}</div>
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
      width: 100,
      align: "right",
      render: (price: number) => <Text type="secondary">{formatCurrency(price)}</Text>,
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
      render: (total: number) => <Text strong>{formatCurrency(total)}</Text>,
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
              {dayjs(sale.createdAt).format("DD MMM YYYY · hh:mm A")}
            </SuccessSubtext>
          </SuccessTextWrap>
          <InvoiceNumBadge>{sale.invoiceNumber}</InvoiceNumBadge>
        </SuccessRow>
        <MetaPills>
          <MetaPill>
            <PillLabel>Payment</PillLabel>
            {sale.paymentMethod}
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
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </SumRow>
          {sale.discountAmount > 0 && (
            <SumRow>
              <DiscountText>Discount</DiscountText>
              <DiscountText>−{formatCurrency(sale.discountAmount)}</DiscountText>
            </SumRow>
          )}
          {sale.taxAmount > 0 && (
            <SumRow>
              <span>Tax</span>
              <span>{formatCurrency(sale.taxAmount)}</span>
            </SumRow>
          )}
          <TotalSumRow>
            <span>Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </TotalSumRow>
        </SummaryCard>

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