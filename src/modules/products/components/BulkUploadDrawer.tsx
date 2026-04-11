"use client";

import { useState } from "react";
import { Drawer, Steps, Button, Space, Typography, Upload, Table, Alert, Spin, Result, App, Tag, Flex } from "antd";
import { DownloadOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { parseFile } from "@/shared/utils/fileParser";
import { validateProductRows } from "@/shared/utils/bulkValidators";
import type { BulkProductRow, BulkProductValidated, BulkUploadRowError } from "../types";

const { Dragger } = Upload;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PreviewRow = {
  _row: number;
  _error?: string;
  brandName: string;
  categoryName: string;
  sku: string;
  name: string;
  basePrice: string;
  costPrice: string;
  sizesAndQuantities: string;
};

const downloadErrorCsv = (errors: BulkUploadRowError[]) => {
  const header = "row,identifier,error";
  const lines = errors.map(
    (e) =>
      `${e.row},"${e.identifier.replace(/"/g, '""')}","${e.message.replace(/"/g, '""')}"`
  );

  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product-import-errors.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const ProductBulkUploadDrawer = ({ open, onClose, onSuccess }: Props) => {
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; rowCount: number } | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [validatedRows, setValidatedRows] = useState<BulkProductValidated[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    | { success: true; imported: number }
    | { success: false; errors: BulkUploadRowError[] }
    | null
  >(null);

  const reset = () => {
    setStep(0);
    setFileInfo(null);
    setPreviewRows([]);
    setValidatedRows([]);
    setImporting(false);
    setImportResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (file: File) => {
    try {
      const parsed = await parseFile(file);
      const rawRows = parsed.rows as BulkProductRow[];
      const { validated, errors } = validateProductRows(rawRows);

      const valMap = new Map<number, BulkProductValidated>();
      let validIdx = 0;
      for (let i = 0; i < rawRows.length; i++) {
        if (!errors.find((e) => e.row === i + 1)) {
          valMap.set(i, validated[validIdx++]);
        }
      }

      const preview: PreviewRow[] = rawRows.map((raw, i) => {
        const rowNum = i + 1;
        const err = errors.find((e) => e.row === rowNum);
        return {
          _row: rowNum,
          _error: err?.message,
          brandName: raw.brand_name?.trim() ?? "",
          categoryName: raw.category_name?.trim() ?? "",
          sku: raw.sku?.trim() ?? "",
          name: raw.name?.trim() ?? "",
          basePrice: raw.base_price?.toString().trim() ?? "",
          costPrice: raw.cost_price?.toString().trim() ?? "",
          sizesAndQuantities: raw.sizes_and_quantities?.trim() ?? "",
        };
      });

      setPreviewRows(preview);
      setValidatedRows(validated);
      setFileInfo({ name: file.name, rowCount: rawRows.length });
      setStep(2);
    } 
    catch (err) {
        console.error("Bulk upload drawer - handleFileChange: ", err);
        message.error(err instanceof Error ? err.message : "Failed to parse file");
    }
    return false;
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validatedRows }),
      });
      const data = await res.json();
      setImportResult(data);
      setStep(3);
    } 
    catch (err) {
      console.error("Bulk upload drawer - handleImport: ", err);
      message.error(err instanceof Error ? err.message : "Network error — please try again");
    } 
    finally {
      setImporting(false);
    }
  };

  const errorCount = previewRows.filter((r) => r._error).length;
  const validCount = previewRows.length - errorCount;

  const previewColumns: ColumnsType<PreviewRow> = [
    {
      title: "#",
      dataIndex: "_row",
      width: 50,
      render: (v: number) => <Typography.Text type="secondary">{v}</Typography.Text>,
    },
    {
      title: "Brand",
      dataIndex: "brandName",
      width: 100,
      render: (v: string, r) =>
        r._error ? (
          <Typography.Text type="danger">{v || "—"}</Typography.Text>
        ) : (
          <Typography.Text>{v}</Typography.Text>
        ),
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      width: 110,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      width: 110,
      render: (v: string) =>
        v ? (
          <Typography.Text code>{v}</Typography.Text>
        ) : (
          <Typography.Text type="secondary" italic>
            auto
          </Typography.Text>
        ),
    },
    {
      title: "Name",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Price",
      dataIndex: "basePrice",
      width: 80,
      align: "right",
      render: (v: string) => (v ? `₹${v}` : "—"),
    },
    {
      title: "Sizes",
      dataIndex: "sizesAndQuantities",
      width: 140,
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <Typography.Text code style={{ fontSize: 11 }}>
            {v}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Error",
      dataIndex: "_error",
      render: (e: string | undefined) =>
        e ? (
          <Typography.Text type="danger">{e}</Typography.Text>
        ) : (
          <Tag color="green">✓ Valid</Tag>
        ),
    },
  ];

  return (
    <Drawer
      title="Bulk Upload Products"
      size={820}
      open={open}
      onClose={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Steps
        current={step}
        items={[
          { title: "Template" },
          { title: "Upload" },
          { title: "Preview" },
          { title: "Done" },
        ]}
        style={{ marginBottom: 32 }}
        size="small"
      />

      {/* ── Step 1: Template ── */}
      {step === 0 && (
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            title="Download a template, fill it in, then upload."
            description={
              <>
                The Excel template includes brand/category dropdowns, price validation, and a
                per-row Status column. Recommended over CSV for large batches.
              </>
            }
          />
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => window.open("/api/products/template?format=csv", "_blank")}
            >
              Download CSV Template
            </Button>
            <Button
              icon={<DownloadOutlined />}
              type="primary"
              ghost
              onClick={() => window.open("/api/products/template?format=xlsx", "_blank")}
            >
              Download Excel Template
            </Button>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Required: <strong>brand_name</strong>, <strong>category_name</strong>,{" "}
            <strong>name</strong>, <strong>base_price</strong>, <strong>cost_price</strong>.
            Optional: sku (auto-generated if blank), sizes_and_quantities, external_barcode,
            image_url, attributes.
          </Typography.Text>
          <div style={{ textAlign: "right" }}>
            <Button type="primary" onClick={() => setStep(1)}>
              Next →
            </Button>
          </div>
        </Space>
      )}

      {/* ── Step 2: Upload ── */}
      {step === 1 && (
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Dragger
            accept=".csv,.xlsx,.xls"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              handleFileChange(file);
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag a .csv or .xlsx file here</p>
            <p className="ant-upload-hint">Max 10 MB · .csv · .xlsx · .xls</p>
          </Dragger>
          {fileInfo && (
            <Alert
              type="success"
              title={`${fileInfo.name} — ${fileInfo.rowCount} rows found`}
            />
          )}
          <Flex justify="space-between">
            <Button onClick={() => setStep(0)}>← Back</Button>
          </Flex>
        </Space>
      )}

      {/* ── Step 3: Preview ── */}
      {step === 2 && (
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            type={errorCount > 0 ? "error" : "success"}
            showIcon
            title={
              errorCount > 0
                ? `${validCount} valid · ${errorCount} errors — fix the file and re-upload`
                : `${validCount} rows valid — ready to import`
            }
          />
          <Table<PreviewRow>
            size="small"
            dataSource={previewRows}
            columns={previewColumns}
            rowKey="_row"
            pagination={{ pageSize: 20, showSizeChanger: false }}
            rowClassName={(r) => (r._error ? "bulk-row-error" : "bulk-row-valid")}
            scroll={{ x: true }}
          />
          <Flex justify="space-between">
            <Button onClick={() => setStep(1)}>← Re-upload</Button>
            <Button
              type="primary"
              disabled={errorCount > 0}
              loading={importing}
              onClick={handleImport}
            >
              Import {validCount} Products
            </Button>
          </Flex>
        </Space>
      )}

      {/* ── Step 4: Done ── */}
      {step === 3 && (
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {importing && <Spin description="Importing..." style={{ width: "100%", padding: 48 }} />}
          {importResult?.success && (
            <Result
              icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              title={`${importResult.imported} product${importResult.imported !== 1 ? "s" : ""} imported successfully!`}
              extra={
                <Space>
                  <Button onClick={handleClose}>Close</Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      onSuccess();
                      handleClose();
                    }}
                  >
                    View Products
                  </Button>
                </Space>
              }
            />
          )}
          {importResult && !importResult.success && (
            <>
              <Result
                icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                title="Import failed"
                subTitle="The server rejected the batch. Fix the errors below and try again."
              />
              <Alert
                type="error"
                showIcon
                title={`${importResult.errors.length} error${importResult.errors.length !== 1 ? "s" : ""} returned by server`}
              />
              <Table
                size="small"
                dataSource={importResult.errors}
                rowKey="row"
                pagination={false}
                columns={[
                  { title: "Row", dataIndex: "row", width: 60 },
                  { title: "Name / SKU", dataIndex: "identifier" },
                  {
                    title: "Error",
                    dataIndex: "message",
                    render: (v: string) => (
                      <Typography.Text type="danger">{v}</Typography.Text>
                    ),
                  },
                ]}
              />
              <Space>
                <Button
                  onClick={() => downloadErrorCsv(importResult.errors)}
                  icon={<DownloadOutlined />}
                >
                  Download Error Report
                </Button>
                <Button onClick={() => setStep(1)}>← Try Again</Button>
              </Space>
            </>
          )}
        </Space>
      )}
    </Drawer>
  );
}

export default ProductBulkUploadDrawer;