"use client";

import { useState, useCallback, useMemo } from "react";
import { Modal, Button, Typography, Table, App, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { PrinterOutlined, DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import BarcodeGenerator from "./BarcodeGenerator";
import {
  BarcodePreview,
  CopiesInput,
} from "./LabelPrinter.styled";
import { generateBarcodeLabelHTML } from "@/modules/barcode/services/barcodeExportService";

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
  const [exportLoading, setExportLoading] = useState(false);

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

  const handleExportPdf = useCallback(
    async (format: "download" | "preview" | "coreldraw" = "download") => {
      try {
        setExportLoading(true);

        const labels = variants.flatMap((variant) =>
          Array.from({ length: copiesMap[variant.variantSku] ?? 1 }, () => ({
            productName,
            sku: variant.variantSku,
            sizeLabel: variant.sizeLabel,
            quantity: copiesMap[variant.variantSku] ?? 1,
            unitPrice: variant.sellPrice ?? 0,
            mrp: variant.mrp ?? 0,
            barcodeValue: variant.ean13 || variant.variantSku,
          }))
        );

        if (labels.length === 0) {
          message.error("No labels to export");
          return;
        }

        const response = await fetch("/api/barcode/export-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labels,
            format: format === "coreldraw" ? "coreldraw" : "13x19",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "PDF export failed");
        }

        const blob = await response.blob();

        if (format === "preview") {
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `barcode-labels-${format === "coreldraw" ? "coreldraw-" : ""}${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        message.success(`${format === "preview" ? "Preview opened" : "PDF exported successfully"}`);
        setOpen(false);
      } catch (error) {
        console.error("[LabelPrinter PDF export]", error);
        message.error(error instanceof Error ? error.message : "PDF export failed");
      } finally {
        setExportLoading(false);
      }
    },
    [copiesMap, message, productName, variants]
  );

  const exportMenuItems: MenuProps["items"] = [
    {
      key: "preview",
      icon: <EyeOutlined />,
      label: "Preview PDF",
      onClick: () => handleExportPdf("preview"),
    },
    {
      key: "download",
      icon: <DownloadOutlined />,
      label: "Download PDF",
      onClick: () => handleExportPdf("download"),
    },
    {
      type: "divider",
    },
    {
      key: "coreldraw",
      icon: <DownloadOutlined />,
      label: "Export for CorelDRAW",
      onClick: () => handleExportPdf("coreldraw"),
    },
  ];

  // ── Print all labels in one print job ────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Build flat list: each variant repeated its copies times
    const labels = variants.flatMap((v) =>
      Array.from({ length: copiesMap[v.variantSku] ?? 1 }, () => ({
        productName,
        sku: v.variantSku,
        sizeLabel: v.sizeLabel,
        quantity: copiesMap[v.variantSku] ?? 1,
        unitPrice: v.sellPrice ?? 0,
        mrp: v.mrp ?? 0,
        barcodeValue: v.ean13 || v.variantSku, // Use EAN-13 if available
      }))
    );

    printWindow.document.write(generateBarcodeLabelHTML(labels, { autoPrint: true }));
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
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            disabled={totalLabels === 0}
          >
            Browser Print
          </Button>,
          <Dropdown
            key="export-dropdown"
            menu={{ items: exportMenuItems }}
            disabled={totalLabels === 0 || exportLoading}
          >
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={exportLoading}
              disabled={totalLabels === 0}
            >
              Export PDF
            </Button>
          </Dropdown>,
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
