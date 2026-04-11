"use client";

import { useState, useRef } from "react";
import { Drawer, Steps, Button, Space, Typography, Upload, Table, Alert, Spin, Result, App, Tag, Flex } from "antd";
import { DownloadOutlined, UploadOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import type { ColumnsType } from "antd/es/table";
import { parseFile } from "@/shared/utils/fileParser";
import { validateBrandRows } from "@/shared/utils/bulkValidators";
import type { BulkBrandRow, BulkBrandValidated, BulkUploadRowError } from "../types";

const { Dragger } = Upload;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PreviewRow = BulkBrandValidated & {
  _row: number;
  _error?: string;
};

type StepKey = "template" | "upload" | "preview" | "done";
const STEPS: { title: string; key: StepKey }[] = [
  { title: "Template", key: "template" },
  { title: "Upload", key: "upload" },
  { title: "Preview", key: "preview" },
  { title: "Done", key: "done" },
];

const downloadErrorCsv = (errors: BulkUploadRowError[]) => {
  const header = "row,name,error";
  const lines = errors.map((e) => `${e.row},"${e.identifier.replace(/"/g, '""')}","${e.message.replace(/"/g, '""')}"`);
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "brand-import-errors.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const BrandBulkUploadDrawer = ({ open, onClose, onSuccess }: Props) => {
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; rowCount: number } | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [validatedRows, setValidatedRows] = useState<BulkBrandValidated[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    | { success: true; imported: number }
    | { success: false; errors: BulkUploadRowError[] }
    | null
  >(null);
  const fileRef = useRef<UploadFile | null>(null);

  const reset = () => {
    setStep(0);
    setFileInfo(null);
    setPreviewRows([]);
    setValidatedRows([]);
    setImporting(false);
    setImportResult(null);
    fileRef.current = null;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Step 1 → 2
  const handleDownloadCsv = () => {
    window.open("/api/brands/template?format=csv", "_blank");
  };
  const handleDownloadXlsx = () => {
    window.open("/api/brands/template?format=xlsx", "_blank");
  };

  // Step 2: parse file
  const handleFileChange = async (file: File) => {
    try {
      const parsed = await parseFile(file);
      const rawRows = parsed.rows as BulkBrandRow[];
      const { validated, errors } = validateBrandRows(rawRows);

      // Build preview rows — combine valid + invalid for full picture
      const preview: PreviewRow[] = rawRows.map((raw, i) => {
        const rowNum = i + 1;
        const err = errors.find((e) => e.row === rowNum);
        const valRow = validated.find((_, vi) => {
          // find matching validated row by counting non-error rows
          let count = 0;
          for (let j = 0; j <= i; j++) {
            if (!errors.find((e) => e.row === j + 1)) count++;
          }
          return vi + 1 === count;
        });
        return {
          _row: rowNum,
          _error: err?.message,
          name: raw.name?.trim() ?? "",
          logoUrl: raw.logo_url?.trim() || null,
          isActive: (raw.is_active?.trim().toLowerCase() ?? "") !== "no",
          ...(valRow ?? {}),
        };
      });

      setPreviewRows(preview);
      setValidatedRows(validated);
      setFileInfo({ name: file.name, size: file.size, rowCount: rawRows.length });
      setStep(2);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to parse file");
    }
    return false; // prevent antd auto-upload
  };

  // Step 3 → 4: import
  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/brands/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validatedRows }),
      });
      const data = await res.json();
      setImportResult(data);
      setStep(3);
    } catch {
      message.error("Network error — please try again");
    } finally {
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
      title: "Name",
      dataIndex: "name",
      render: (v: string, r) =>
        r._error ? (
          <Typography.Text type="danger">{v || "—"}</Typography.Text>
        ) : (
          <Typography.Text>{v}</Typography.Text>
        ),
    },
    {
      title: "Logo URL",
      dataIndex: "logoUrl",
      ellipsis: true,
      render: (v: string | null) =>
        v ? <Typography.Link href={v} target="_blank" ellipsis>{v}</Typography.Link> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Active",
      dataIndex: "isActive",
      width: 80,
      align: "center",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Error",
      dataIndex: "_error",
      render: (e: string | undefined) =>
        e ? <Typography.Text type="danger">{e}</Typography.Text> : <Tag color="green">✓ Valid</Tag>,
    },
  ];

  const currentStepIndex = step;

  return (
    <Drawer
      title="Bulk Upload Brands"
      size={720}
      open={open}
      onClose={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Steps
        current={currentStepIndex}
        items={STEPS.map((s) => ({ title: s.title }))}
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
                The Excel template includes built-in cell validation, live error highlighting
                and a Status column. Recommended over CSV for large batches.
              </>
            }
          />
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadCsv}>
              Download CSV Template
            </Button>
            <Button icon={<DownloadOutlined />} type="primary" ghost onClick={handleDownloadXlsx}>
              Download Excel Template
            </Button>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Required columns: <strong>name</strong>. Optional: logo_url, is_active (yes/no, defaults to yes).
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
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
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
              Import {validCount} Brands
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
              title={`${importResult.imported} brand${importResult.imported !== 1 ? "s" : ""} imported successfully!`}
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
                    View Brands
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
                  { title: "Name", dataIndex: "identifier" },
                  { title: "Error", dataIndex: "message", render: (v: string) => <Typography.Text type="danger">{v}</Typography.Text> },
                ]}
              />
              <Space>
                <Button onClick={() => downloadErrorCsv(importResult.errors)} icon={<DownloadOutlined />}>
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

export default BrandBulkUploadDrawer;