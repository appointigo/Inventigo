"use client";

import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Select, DatePicker, Button, Space, Modal, Flex, App, Switch, Upload, Checkbox, Segmented, Typography, Image } from "antd";
import { PaperClipOutlined, LoadingOutlined, FilePdfOutlined, PercentageOutlined } from "@ant-design/icons";
import { upload } from "@vercel/blob/client";
type UploadRequestOption = Parameters<NonNullable<import("antd/es/upload").UploadProps["customRequest"]>>[0];
import dayjs from "dayjs";
import type { ExpenseFormValues, StoreExpense } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import { PAYMENT_MODES, RECURRENCE_FREQS, GST_RATES } from "../types";

const ANT_COLOR_MAP: Record<string, string> = {
  default: "#d9d9d9", blue: "#1677ff", purple: "#722ed1",
  cyan: "#13c2c2", green: "#52c41a", magenta: "#eb2f96",
  red: "#ff4d4f", orange: "#fa8c16", yellow: "#fadb14",
  volcano: "#fa541c", geekblue: "#2f54eb", gold: "#faad14",
  lime: "#a0d911",
};

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  initialValues?: StoreExpense | null;
  storeId: string;
  loading?: boolean;
  categories: ExpenseCategoryOption[];
  onAddCategory: (name: string, colorKey: string) => Promise<ExpenseCategoryOption | null>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  canManageCategories?: boolean;
}

type ExpenseFormFields = Omit<ExpenseFormValues, "date"> & { date: dayjs.Dayjs };

const ExpenseForm = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  storeId,
  loading = false,
  categories,
  onAddCategory,
  onDeleteCategory,
  canManageCategories = false,
}: ExpenseFormProps) => {
  const [form] = Form.useForm<ExpenseFormFields>();
  const { message } = App.useApp();
  const isEdit = !!initialValues;

  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("default");
  const [addingCat, setAddingCat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState(false);
  const [gstModalOpen, setGstModalOpen] = useState(false);

  // Compute base amount for GST auto-calculation
  const amount = Form.useWatch("amount", form);
  const gstRate = Form.useWatch("gstRate", form);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          storeId: initialValues.storeId,
          category: initialValues.category,
          amount: initialValues.amount,
          date: dayjs(initialValues.date),
          note: initialValues.note ?? undefined,
          paymentMode: initialValues.paymentMode ?? undefined,
          isRecurring: initialValues.isRecurring,
          recurrenceFreq: initialValues.recurrenceFreq ?? undefined,
          vendorGstin: initialValues.vendorGstin ?? undefined,
          gstRate: initialValues.gstRate ?? undefined,
          gstAmount: initialValues.gstAmount ?? undefined,
          isItcEligible: initialValues.isItcEligible,
        });
        setReceiptUrl(initialValues.receiptUrl ?? undefined);
        setIsRecurring(initialValues.isRecurring);
      } 
      else {
        form.resetFields();
        form.setFieldsValue({ storeId, date: dayjs() });
        setReceiptUrl(undefined);
        setIsRecurring(false);
        setGstModalOpen(false);
      }
    }
  }, [open, initialValues, storeId, form]);

  // Auto-compute GST amount when rate or amount changes
  useEffect(() => {
    if (amount && gstRate != null) {
      const computed = parseFloat(((Number(amount) * Number(gstRate)) / 100).toFixed(2));
      form.setFieldValue("gstAmount", computed);
    }
  }, [amount, gstRate, form]);

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      const created = await onAddCategory(name, newCatColor);
      if (created) {
        message.success(`Category "${created.name}" added`);
        form.setFieldValue("category", created.name);
        setNewCatName("");
        setNewCatColor("default");
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to add category");
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: ExpenseCategoryOption) => {
    const ok = await onDeleteCategory(cat.id);
    if (ok) {
      message.success(`Category "${cat.name}" deleted`);
      if (form.getFieldValue("category") === cat.name) {
        form.setFieldValue("category", undefined);
      }
    } else {
      message.error("Failed to delete category");
    }
  };

  const handleReceiptUpload = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setReceiptUrl(blob.url);
      form.setFieldValue("receiptUrl", blob.url);
      options.onSuccess?.(blob);
      message.success("Receipt uploaded");
    } catch (err) {
      console.error(err);
      options.onError?.(err as Error);
      message.error("Receipt upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async (vals: Omit<ExpenseFormValues, "date"> & { date: dayjs.Dayjs }) => {
    await onSubmit({
      ...vals,
      date: vals.date.format("YYYY-MM-DD"),
      receiptUrl: receiptUrl,
    });
    form.resetFields();
  };

  const isPdf = receiptUrl?.toLowerCase().endsWith(".pdf");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Edit Expense" : "Add Expense"}
      footer={null}
      destroyOnHidden
      width={540}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 8 }}
      >
        <Form.Item name="storeId" hidden><Input /></Form.Item>
        <Form.Item name="receiptUrl" hidden><Input /></Form.Item>

        {/* ── Row 1: Category + Amount ─────────────────── */}
        <Flex gap={12}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select a category" }]}
            style={{ flex: 1, marginBottom: 12 }}
          >
            <Select
              placeholder="Select category"
              optionLabelProp="label"
            >
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.name} label={cat.name}>
                  <Flex align="center" gap={8}>
                    <span style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: ANT_COLOR_MAP[cat.colorKey] ?? "#d9d9d9",
                      flexShrink: 0,
                    }} />
                    <span>{cat.name}</span>
                  </Flex>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 0.01, message: "Must be > 0" },
            ]}
            style={{ flex: 1, marginBottom: 12 }}
          >
            <InputNumber
              style={{ width: "100%" }}
              prefix="₹"
              min={0.01}
              precision={2}
              placeholder="0.00"
            />
          </Form.Item>
        </Flex>

        {/* ── Row 2: Date + Payment Mode ───────────────── */}
        <Flex gap={12}>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: "Required" }]}
            style={{ flex: 1, marginBottom: 12 }}
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item name="paymentMode" label="Payment Mode" style={{ flex: 1, marginBottom: 12 }}>
            <Select placeholder="Select mode" allowClear>
              {PAYMENT_MODES.map((m) => (
                <Select.Option key={m.value} value={m.value}>
                  {m.icon} {m.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Flex>

        {/* ── Note ────────────────────────────────────── */}
        <Form.Item name="note" label="Note (optional)" style={{ marginBottom: 12 }}>
          <Input.TextArea rows={2} placeholder="e.g. April rent payment" maxLength={500} />
        </Form.Item>

        {/* ── Receipt upload ───────────────────────────── */}
        <Form.Item label="Receipt / Invoice" style={{ marginBottom: 12 }}>
          {receiptUrl ? (
            <Flex align="center" gap={12}>
              {isPdf ? (
                <Flex align="center" gap={6}>
                  <FilePdfOutlined style={{ fontSize: 28, color: "#ff4d4f" }} />
                  <Typography.Link href={receiptUrl} target="_blank" rel="noopener noreferrer">
                    View PDF
                  </Typography.Link>
                </Flex>
              ) : (
                <Image
                  src={receiptUrl}
                  alt="Receipt"
                  width={64}
                  height={64}
                  style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #f0f0f0" }}
                />
              )}
              <Button
                size="small"
                danger
                onClick={() => { setReceiptUrl(undefined); form.setFieldValue("receiptUrl", undefined); }}
              >
                Remove
              </Button>
            </Flex>
          ) : (
            <Upload
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              showUploadList={false}
              maxCount={1}
              customRequest={handleReceiptUpload}
            >
              <Button
                icon={uploading ? <LoadingOutlined /> : <PaperClipOutlined />}
                loading={uploading}
              >
                Attach receipt
              </Button>
              <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                JPEG, PNG, PDF · max 5 MB
              </Typography.Text>
            </Upload>
          )}
        </Form.Item>

        {/* ── Recurring ───────────────────────────────── */}
        <Form.Item label="Recurring Expense" style={{ marginBottom: 12 }}>
          <Flex align="center" gap={12}>
            <Form.Item name="isRecurring" valuePropName="checked" noStyle>
              <Switch
                size="small"
                onChange={(checked) => {
                  setIsRecurring(checked);
                  if (!checked) {
                    form.setFieldValue("recurrenceFreq", undefined);
                  } else {
                    form.setFieldValue("recurrenceFreq", RECURRENCE_FREQS[0].value);
                  }
                }}
              />
            </Form.Item>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Auto-generate this expense every period
            </Typography.Text>
          </Flex>
          {isRecurring && (
            <Form.Item
              name="recurrenceFreq"
              rules={[{ required: true, message: "Select frequency" }]}
              style={{ marginTop: 10, marginBottom: 0 }}
            >
              <Segmented
                options={RECURRENCE_FREQS.map((f) => ({ label: f.label, value: f.value }))}
              />
            </Form.Item>
          )}
        </Form.Item>

        {/* ── GST Details (opens sub-modal) ───────────── */}
        <Form.Item style={{ marginBottom: 12 }}>
          <Flex align="center" gap={12}>
            <Button
              type="dashed"
              icon={<PercentageOutlined />}
              size="small"
              onClick={() => setGstModalOpen(true)}
            >
              GST Details (optional)
            </Button>
            {(gstRate != null || form.getFieldValue("vendorGstin")) && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {form.getFieldValue("vendorGstin") ? `GSTIN: ${form.getFieldValue("vendorGstin")}` : ""}
                {gstRate != null ? `${form.getFieldValue("vendorGstin") ? " · " : ""}${gstRate}% GST` : ""}
              </Typography.Text>
            )}
          </Flex>
        </Form.Item>

        {/* GST sub-modal — Form.Items share parent form context via React tree */}
        <Modal
          open={gstModalOpen}
          onCancel={() => setGstModalOpen(false)}
          title="GST Details"
          footer={[
            <Button
              key="clear"
              onClick={() => {
                form.setFieldsValue({ vendorGstin: undefined, gstRate: undefined, gstAmount: undefined, isItcEligible: false });
                setGstModalOpen(false);
              }}
            >
              Clear GST
            </Button>,
            <Button key="done" type="primary" onClick={() => setGstModalOpen(false)}>
              Done
            </Button>,
          ]}
          width={480}
        >
          <div style={{ paddingTop: 8 }}>
            <Flex gap={12}>
              <Form.Item
                name="vendorGstin"
                label="Vendor GSTIN"
                style={{ flex: 1, marginBottom: 12 }}
                rules={[{
                  pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                  message: "Invalid GSTIN format",
                }]}
              >
                <Input placeholder="22ABCDE1234F1Z5" maxLength={15} style={{ textTransform: "uppercase" }} />
              </Form.Item>

              <Form.Item name="gstRate" label="GST Rate" style={{ flex: 1, marginBottom: 12 }}>
                <Select placeholder="Select rate" allowClear>
                  {GST_RATES.map((r) => (
                    <Select.Option key={r} value={r}>{r}%</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Flex>

            <Flex gap={12}>
              <Form.Item name="gstAmount" label="GST Amount (₹)" style={{ flex: 1, marginBottom: 12 }}>
                <InputNumber
                  style={{ width: "100%" }}
                  prefix="₹"
                  min={0}
                  precision={2}
                  placeholder="Auto-computed"
                />
              </Form.Item>

              <Form.Item
                name="isItcEligible"
                label="ITC Eligible"
                valuePropName="checked"
                style={{ flex: 1, marginBottom: 12 }}
              >
                <Checkbox>Claim Input Tax Credit</Checkbox>
              </Form.Item>
            </Flex>

            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ITC can be claimed only if the vendor is GST-registered and has filed their returns.
            </Typography.Text>
          </div>
        </Modal>

        {/* ── Footer ──────────────────────────────────── */}
        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? "Save Changes" : "Add Expense"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ExpenseForm;