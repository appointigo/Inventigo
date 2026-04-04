"use client";

import { useState, useCallback, useEffect } from "react";
import { Modal, Button, Typography, Table, App } from "antd";
import { PrinterOutlined, DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import BarcodeGenerator from "./BarcodeGenerator";
import {
  BarcodePreview,
  CopiesInput,
} from "./LabelPrinter.styled";

const { Text } = Typography;

export interface LabelVariant {
  variantSku: string;
  sizeLabel: string;
}

interface LabelPrinterProps {
  productName: string;
  price: number;
  variants: LabelVariant[];
}

export default function LabelPrinter({ productName, price, variants }: LabelPrinterProps) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>({});

  // Initialise copies to 1 for each variant whenever the modal opens or variants change
  useEffect(() => {
    setCopiesMap(
      variants.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.variantSku]: 1 }), {})
    );
  }, [variants]);

  const totalLabels = variants.reduce((sum, v) => sum + (copiesMap[v.variantSku] ?? 1), 0);

  const setCopies = (variantSku: string, value: number) => {
    setCopiesMap((prev) => ({ ...prev, [variantSku]: Math.max(1, Math.min(100, value)) }));
  };

  // ── Download PNG for a single variant ────────────────────────────────────
  const handleDownloadPng = useCallback(
    (variantSku: string) => {
      const container = document.getElementById(`lp-barcode-${variantSku}`);
      const svgEl = container?.querySelector("svg");
      if (!svgEl) {
        message.error("Barcode not rendered yet");
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `barcode-${variantSku}.png`;
        a.click();
        message.success(`Downloaded barcode-${variantSku}.png`);
      };
      img.src = url;
    },
    [message]
  );

  // ── Print all labels in one print job ────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Build flat list: each variant repeated its copies times
    const labels = variants.flatMap((v) =>
      Array.from({ length: copiesMap[v.variantSku] ?? 1 }, (_, i) => ({
        ...v,
        uid: `${v.variantSku}-${i}`,
      }))
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels — ${productName.replace(/</g, "&lt;")}</title>
          <style>
            @page { size: A4; margin: 10mm; }
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
              height: 34mm;
              border: 0.5px dashed #ccc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm;
              page-break-inside: avoid;
            }
            .label .name {
              font-size: 7pt;
              font-weight: bold;
              text-align: center;
              max-width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .label .size-badge {
              font-size: 8pt;
              font-weight: bold;
              background: #1677ff;
              color: #fff;
              padding: 0 4px;
              border-radius: 3px;
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
            @media print { .label { border: none; } }
          </style>
        </head>
        <body>
          ${labels
            .map(
              (v) => `
            <div class="label" data-sku="${v.variantSku}">
              <div class="name">${productName.replace(/</g, "&lt;")}</div>
              <div class="size-badge">Size: ${v.sizeLabel}</div>
              <svg class="barcode-svg"></svg>
              <div class="price">&#8377;${price.toLocaleString("en-IN")}</div>
            </div>`
            )
            .join("")}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <script>
            window.onload = function() {
              document.querySelectorAll('.label').forEach(function(label) {
                var sku = label.getAttribute('data-sku');
                var svg = label.querySelector('.barcode-svg');
                JsBarcode(svg, sku, {
                  format: "CODE128", width: 1.2, height: 35,
                  displayValue: true, fontSize: 8, margin: 2
                });
              });
              setTimeout(function() { window.print(); }, 400);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setOpen(false);
  };

  const columns: ColumnsType<LabelVariant> = [
    {
      title: "Size",
      dataIndex: "sizeLabel",
      width: 70,
      render: (label: string) => <Text strong>{label}</Text>,
    },
    {
      title: "Variant SKU / Barcode",
      dataIndex: "variantSku",
      render: (sku: string) => (
        <div>
          <div id={`lp-barcode-${sku}`} style={{ lineHeight: 0 }}>
            <BarcodeGenerator value={sku} height={36} width={1.1} fontSize={10} />
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>{sku}</Text>
        </div>
      ),
    },
    {
      title: "Copies",
      width: 110,
      render: (_, record) => (
        <CopiesInput
          min={1}
          max={100}
          value={copiesMap[record.variantSku] ?? 1}
          onChange={(v) => setCopies(record.variantSku, (v as number) ?? 1)}
          style={{ width: 90, marginLeft: 0 }}
        />
      ),
    },
    {
      title: "",
      width: 44,
      render: (_, record) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => handleDownloadPng(record.variantSku)}
          title="Download PNG"
        />
      ),
    },
  ];

  return (
    <>
      <Button icon={<PrinterOutlined />} onClick={() => setOpen(true)}>
        Print Labels
      </Button>
      <Modal
        title={`Print Labels — ${productName}`}
        open={open}
        onCancel={() => setOpen(false)}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            disabled={totalLabels === 0}
          >
            Print {totalLabels} label{totalLabels !== 1 ? "s" : ""}
          </Button>,
        ]}
      >
        {variants.length === 0 ? (
          <BarcodePreview>
            <Text type="secondary">No size variants found for this product.</Text>
          </BarcodePreview>
        ) : (
          <Table
            columns={columns}
            dataSource={variants}
            rowKey="variantSku"
            pagination={false}
            size="small"
          />
        )}
      </Modal>
    </>
  );
}
