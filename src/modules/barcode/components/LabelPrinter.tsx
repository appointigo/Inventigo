"use client";

import { useState, useCallback, useMemo } from "react";
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
  ean13?: string; // Optional: EAN-13 barcode for the variant
  mrp?: number;
  sellPrice?: number;
}

interface LabelPrinterProps {
  productName: string;
  variants: LabelVariant[];
}

export default function LabelPrinter({ productName, variants }: LabelPrinterProps) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>({});

  // Compute initial copiesMap based on variants
  const initialCopiesMap = useMemo(
    () => variants.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.variantSku]: 1 }), {}),
    [variants]
  );

  // Update copiesMap when modal opens or variants change
  const handleModalOpen = useCallback(() => {
    setCopiesMap(initialCopiesMap);
    setOpen(true);
  }, [initialCopiesMap]);

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
        barcodeValue: v.ean13 || v.variantSku, // Use EAN-13 if available
      }))
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels — ${productName.replace(/</g, "&lt;")}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 4mm;
              font-family: Arial, sans-serif;
              display: flex;
              flex-wrap: wrap;
              gap: 3mm;
            }
            .label {
              width: 264px;
              height: 120px;
              outline: 1px solid #ccc;
              border-radius: 7px;
              background: white;
              padding: 6px 8px;
              display: flex;
              align-items: stretch;
              gap: 0;
              page-break-inside: avoid;
              overflow: hidden;
            }
            .label-left {
              width: 108px;
              flex-shrink: 0;
              display: flex;
              flex-direction: column;
              gap: 4px;
              justify-content: center;
            }
            .label-divider {
              width: 0.5px;
              background: #ddd;
              align-self: stretch;
              margin: 2px 0;
            }
            .label-right {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 2px;
              overflow: hidden;
            }
            .name {
              font-family: Georgia, serif;
              font-size: 8.5px;
              font-weight: bold;
              color: #111;
              line-height: 1.3;
              text-align: left;
              word-break: break-word;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            .size-badge {
              background: #1e90ff;
              color: white;
              font-size: 7.5px;
              font-weight: bold;
              padding: 1.5px 7px;
              border-radius: 20px;
              text-align: center;
              white-space: nowrap;
            }
            .promo-badge {
              border: 1px solid #2e7d32;
              color: #2e7d32;
              background: #f4fbf4;
              font-size: 6.5px;
              font-weight: bold;
              text-transform: uppercase;
              padding: 1.5px 4px;
              border-radius: 3px;
              text-align: center;
              line-height: 1.2;
              word-break: break-word;
              width: 100%;
            }
            .price-row {
              display: flex;
              align-items: center;
              gap: 4px;
              flex-wrap: nowrap;
              width: 100%;
            }
            .mrp {
              font-family: monospace;
              font-size: 7.5px;
              color: #999;
              text-decoration: line-through;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .sell-price {
              font-family: monospace;
              font-size: 11px;
              font-weight: bold;
              color: #c62828;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .discount-tag {
              background: #c62828;
              color: white;
              font-size: 6px;
              font-weight: bold;
              padding: 1.5px 3.5px;
              border-radius: 3px;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .barcode-svg {
              width: 100%;
              height: 52px;
              margin: 0 2px;
            }
            .barcode-numbers {
              display: flex;
              justify-content: space-between;
              width: 100%;
              padding: 0 4px;
              font-family: monospace;
              font-size: 6.5px;
              color: #444;
            }
            .barcode-input {
              width: 100%;
              padding: 1px 3px;
              border:none;
              font-family: monospace;
              font-size: 6.5px;
              text-align: center;
              color: #333;
            }
            @media print { .label { border: none; } }
          </style>
        </head>
        <body>
          ${labels
            .map(
              (v) => {
                const mrp = Number(v.mrp ?? 0);
                const sellPrice = Number(v.sellPrice ?? 0);
                const discount = mrp > 0 && sellPrice > 0 ? Math.max(0, Math.round((1 - sellPrice / mrp) * 100)) : 0;
                const barcodeStr = String(v.barcodeValue || "");
                const startDigit = barcodeStr.charAt(0);
                const endDigit = barcodeStr.charAt(barcodeStr.length - 1);
                return `
            <div class="label" data-barcode="${v.barcodeValue}">
              <div class="label-left">
                <div class="name">${productName.replace(/</g, "&lt;")}</div>
                <div class="size-badge">Size: ${v.sizeLabel}</div>
                <div class="promo-badge">RARE THREAD — SPECIAL PRICE</div>
                <div class="price-row">
                  <span class="mrp">₹${mrp.toLocaleString("en-IN")}</span>
                  <span class="sell-price">₹${sellPrice.toLocaleString("en-IN")}</span>
                  <span class="discount-tag">${discount}% OFF</span>
                </div>
              </div>
              <div class="label-divider"></div>
              <div class="label-right">
                <svg class="barcode-svg" preserveAspectRatio="none"></svg>
                <div class="barcode-numbers">
                  <span>${startDigit}</span>
                  <span>${endDigit}</span>
                </div>
                <input type="text" class="barcode-input" value="${v.barcodeValue}" readonly />
              </div>
            </div>`;
              }
            )
            .join("")}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <script>
            window.onload = function() {
              document.querySelectorAll('.label').forEach(function(label) {
                var barcodeValue = label.getAttribute('data-barcode');
                var svg = label.querySelector('.barcode-svg');
                try {
                  JsBarcode(svg, barcodeValue, {
                    format: "EAN13", width: 1.2, height: 48,
                    displayValue: false, margin: 2
                  });
                } catch(e) {
                  // Fallback if EAN-13 fails
                  JsBarcode(svg, barcodeValue, {
                    format: "CODE128", width: 1, height: 46,
                    displayValue: false, margin: 2
                  });
                }
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
      render: (sku: string, record: LabelVariant) => {
        // Use EAN-13 if available, otherwise use variantSku
        const barcodeValue = record.ean13 || sku;
        return (
          <div>
            <div id={`lp-barcode-${sku}`} style={{ lineHeight: 0 }}>
              <BarcodeGenerator value={barcodeValue} height={36} width={150} fontSize={10} />
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{barcodeValue}</Text>
          </div>
        );
      },
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
      <Button icon={<PrinterOutlined />} onClick={handleModalOpen}>
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
