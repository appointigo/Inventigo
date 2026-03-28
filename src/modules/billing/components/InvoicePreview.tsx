"use client";

import { Modal, Table, Descriptions, Tag, Typography, Divider, Button, Space } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Sale, SaleItem } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";

interface InvoicePreviewProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

const { Text, Title } = Typography;

export default function InvoicePreview({ sale, open, onClose }: InvoicePreviewProps) {
  if (!sale) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemRows = sale.items
      .map(
        (item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.productName}<br><small>${item.sku} · Size: ${item.sizeLabel}</small></td>
          <td style="text-align:right">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatCurrency(item.total)}</td>
        </tr>`
      )
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
            <h1>Stockiva</h1>
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
      render: (_, __, index) => index + 1,
    },
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <div>
          <Text strong>{record.productName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.sku} · Size: {record.sizeLabel}
          </Text>
        </div>
      ),
    },
    {
      title: "Price",
      dataIndex: "unitPrice",
      width: 100,
      align: "right",
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 60,
      align: "center",
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 100,
      align: "right",
      render: (total: number) => formatCurrency(total),
    },
  ];

  const statusColor = sale.status === "COMPLETED" ? "green" : "red";

  return (
    <Modal
      title={`Invoice ${sale.invoiceNumber}`}
      open={open}
      onCancel={onClose}
      width={640}
      footer={
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Invoice
          </Button>
        </Space>
      }
    >
      <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Invoice">{sale.invoiceNumber}</Descriptions.Item>
        <Descriptions.Item label="Date">
          {dayjs(sale.createdAt).format("DD MMM YYYY, hh:mm A")}
        </Descriptions.Item>
        <Descriptions.Item label="Payment">
          <Tag>{sale.paymentMethod}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={statusColor}>{sale.status}</Tag>
        </Descriptions.Item>
        {sale.customerName && (
          <Descriptions.Item label="Customer">{sale.customerName}</Descriptions.Item>
        )}
        {sale.customerPhone && (
          <Descriptions.Item label="Phone">{sale.customerPhone}</Descriptions.Item>
        )}
      </Descriptions>

      <Table
        columns={columns}
        dataSource={sale.items}
        rowKey="id"
        pagination={false}
        size="small"
      />

      <Divider style={{ margin: "12px 0" }} />

      <div style={{ textAlign: "right" }}>
        <div style={{ marginBottom: 4 }}>
          <Text>Subtotal: {formatCurrency(sale.subtotal)}</Text>
        </div>
        {sale.discountAmount > 0 && (
          <div style={{ marginBottom: 4 }}>
            <Text type="success">Discount: -{formatCurrency(sale.discountAmount)}</Text>
          </div>
        )}
        {sale.taxAmount > 0 && (
          <div style={{ marginBottom: 4 }}>
            <Text>Tax: {formatCurrency(sale.taxAmount)}</Text>
          </div>
        )}
        <Title level={4} style={{ margin: 0 }}>Total: {formatCurrency(sale.total)}</Title>
      </div>
    </Modal>
  );
}
