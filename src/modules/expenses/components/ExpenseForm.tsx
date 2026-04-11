"use client";

import { useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Space,
  Modal,
  Tag,
  Divider,
  Flex,
  Popconfirm,
  App,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ExpenseFormValues, StoreExpense } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import { CATEGORY_COLOR_PALETTE } from "../types";

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

export default function ExpenseForm({
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
}: ExpenseFormProps) {
  const [form] = Form.useForm<ExpenseFormFields>();
  const { message } = App.useApp();
  const isEdit = !!initialValues;

  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("default");
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          storeId: initialValues.storeId,
          category: initialValues.category,
          amount: initialValues.amount,
          date: dayjs(initialValues.date),
          note: initialValues.note ?? undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          storeId,
          date: dayjs(),
        });
      }
    }
  }, [open, initialValues, storeId, form]);

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

  const handleFinish = async (vals: Omit<ExpenseFormValues, "date"> & { date: dayjs.Dayjs }) => {
    await onSubmit({
      ...vals,
      date: vals.date.format("YYYY-MM-DD"),
    });
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Edit Expense" : "Add Expense"}
      footer={null}
      destroyOnHidden
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 8 }}
      >
        <Form.Item name="storeId" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: "Please select a category" }]}
        >
          <Select
            placeholder="Select category"
            optionLabelProp="label"
            popupRender={(menu) => (
              <>
                {menu}
                {canManageCategories && (
                  <>
                    <Divider style={{ margin: "6px 0" }} />
                    <div style={{ padding: "4px 8px 8px" }}>
                      <div style={{ marginBottom: 6, fontSize: 12, color: "#8c8c8c" }}>
                        Add new category
                      </div>
                      <Flex gap={6}>
                        <Input
                          size="small"
                          placeholder="Category name"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); }
                          }}
                          style={{ flex: 1 }}
                        />
                        <Select
                          size="small"
                          value={newCatColor}
                          onChange={setNewCatColor}
                          style={{ width: 90 }}
                          onKeyDown={(e) => e.stopPropagation()}
                          options={[
                            { value: "default", label: "Grey" },
                            ...CATEGORY_COLOR_PALETTE.map((c) => ({
                              value: c,
                              label: <Tag color={c} style={{ margin: 0 }}>{c}</Tag>,
                            })),
                          ]}
                        />
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          loading={addingCat}
                          onClick={handleAddCategory}
                        />
                      </Flex>
                    </div>
                  </>
                )}
              </>
            )}
          >
            {categories.map((cat) => (
              <Select.Option key={cat.id} value={cat.name} label={cat.name}>
                <Flex justify="space-between" align="center">
                  <Tag color={cat.colorKey} style={{ margin: 0 }}>
                    {cat.name}
                  </Tag>
                  {canManageCategories && (
                    <Popconfirm
                      title={`Delete "${cat.name}"?`}
                      description="Existing expenses will keep this label."
                      onConfirm={(e) => { e?.stopPropagation(); handleDeleteCategory(cat); }}
                      onPopupClick={(e) => e.stopPropagation()}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  )}
                </Flex>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: "Please enter an amount" },
            { type: "number", min: 0.01, message: "Amount must be greater than 0" },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            prefix="₹"
            min={0.01}
            precision={2}
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: "Please select a date" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
        </Form.Item>

        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea rows={2} placeholder="e.g. April rent payment" maxLength={500} />
        </Form.Item>

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
