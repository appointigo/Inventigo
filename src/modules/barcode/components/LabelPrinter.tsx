"use client";

import { useState } from "react";
import { Modal, InputNumber, Button, Typography, Space } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import BarcodeGenerator from "./BarcodeGenerator";

interface LabelPrinterProps {
  sku: string;
  productName: string;
  price: number;
}

export default function LabelPrinter({ sku, productName, price }: LabelPrinterProps) {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState(1);

  const handlePrint = () => {
    const labels = Array.from({ length: copies }, (_, i) => i);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels - ${sku}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-wrap: wrap;
              gap: 4mm;
              padding: 2mm;
            }
            .label {
              width: 62mm;
              height: 30mm;
              border: 0.5px dashed #ccc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm;
              page-break-inside: avoid;
            }
            .label .name {
              font-size: 8pt;
              font-weight: bold;
              text-align: center;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              max-width: 100%;
              margin-bottom: 1mm;
            }
            .label .price {
              font-size: 9pt;
              font-weight: bold;
              margin-top: 1mm;
            }
            .label svg, .label canvas, .label img {
              max-width: 55mm;
              height: 14mm;
            }
            @media print {
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          ${labels.map(() => `
            <div class="label">
              <div class="name">${productName.replace(/</g, "&lt;")}</div>
              <div id="barcode-container"></div>
              <div class="price">₹${price.toLocaleString("en-IN")}</div>
            </div>
          `).join("")}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <script>
            window.onload = function() {
              document.querySelectorAll('.label').forEach(function(label) {
                var container = label.querySelector('div:nth-child(2)');
                var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                container.appendChild(svg);
                JsBarcode(svg, "${sku}", {
                  format: "CODE128",
                  width: 1.2,
                  height: 35,
                  displayValue: true,
                  fontSize: 10,
                  margin: 2
                });
              });
              setTimeout(function() { window.print(); }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setOpen(false);
  };

  return (
    <>
      <Button icon={<PrinterOutlined />} onClick={() => setOpen(true)}>
        Print Labels
      </Button>
      <Modal
        title="Print Barcode Labels"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handlePrint}
        okText="Print"
        okButtonProps={{ icon: <PrinterOutlined /> }}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ textAlign: "center", padding: 16, background: "#fafafa", borderRadius: 8 }}>
            <BarcodeGenerator value={sku} height={40} width={1.2} />
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              {productName}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text strong>Number of labels:</Typography.Text>
            <InputNumber
              min={1}
              max={100}
              value={copies}
              onChange={(v) => setCopies(v ?? 1)}
              style={{ width: 100, marginLeft: 12 }}
            />
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              (3 per row on A4)
            </Typography.Text>
          </div>
        </Space>
      </Modal>
    </>
  );
}
