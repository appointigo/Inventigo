"use client";

import { Button, DatePicker, Form, Input, Space, Typography } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { CustomerDto, CustomerUpsertInput } from "../types";

type MetadataEntry = { key: string; value: string };

type CustomerFormValues = {
  name?: string;
  mobile: string;
  email?: string;
  dateOfBirth?: Dayjs;
  notes?: string;
  tags?: string;
  metadataEntries?: MetadataEntry[];
};

type CustomerFormProps = {
  initialValues?: CustomerDto | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CustomerUpsertInput) => Promise<void> | void;
};

const metadataToEntries = (metadata?: Record<string, unknown> | null): MetadataEntry[] => {
  if (!metadata) return [];
  return Object.entries(metadata).map(([key, value]) => ({ key, value: String(value ?? "") }));
};

const tagsToString = (tags?: string[]): string => {
  if (!tags?.length) return "";
  return tags.join(", ");
};

export default function CustomerForm({ initialValues, loading, onCancel, onSubmit }: CustomerFormProps) {
  const [form] = Form.useForm<CustomerFormValues>();

  const handleFinish = async (values: CustomerFormValues) => {
    const metadata: Record<string, unknown> = {};
    for (const row of values.metadataEntries ?? []) {
      const key = row.key?.trim();
      if (!key) continue;
      metadata[key] = row.value?.trim() ?? "";
    }

    const payload: CustomerUpsertInput = {
      name: values.name?.trim() || null,
      mobile: values.mobile,
      email: values.email?.trim() || null,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : null,
      notes: values.notes?.trim() || null,
      tags: values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    await onSubmit(payload);
  };

  return (
    <Form<CustomerFormValues>
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        name: initialValues?.name ?? "",
        mobile: initialValues?.mobile ?? "",
        email: initialValues?.email ?? "",
        dateOfBirth: initialValues?.dateOfBirth ? dayjs(initialValues.dateOfBirth) : undefined,
        notes: initialValues?.notes ?? "",
        tags: tagsToString(initialValues?.tags),
        metadataEntries: metadataToEntries(initialValues?.metadata),
      }}
    >
      <Form.Item label="Name" name="name">
        <Input placeholder="Optional" />
      </Form.Item>

      <Form.Item
        label="Mobile"
        name="mobile"
        rules={[
          { required: true, message: "Mobile is required" },
          {
            validator: async (_, value) => {
              const digits = String(value ?? "").replace(/\D/g, "");
              if ([10, 11, 12].includes(digits.length)) return;
              throw new Error("Enter a valid mobile number");
            },
          },
        ]}
      >
        <Input placeholder="10-digit mobile" />
      </Form.Item>

      <Form.Item label="Email" name="email">
        <Input placeholder="Optional" />
      </Form.Item>

      <Form.Item label="Date of Birth" name="dateOfBirth">
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={3} placeholder="Optional notes" />
      </Form.Item>

      <Form.Item label="Tags" name="tags" extra="Comma separated, for example: vip, frequent">
        <Input placeholder="vip, frequent" />
      </Form.Item>

      <Typography.Text strong>Dynamic Fields (Metadata)</Typography.Text>
      <Form.List name="metadataEntries">
        {(fields, { add, remove }) => (
          <>
            <div style={{ marginTop: 8, marginBottom: 12 }}>
              {fields.map((field) => (
                <Space key={field.key} align="start" style={{ display: "flex", marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, "key"]}
                    rules={[{ required: true, message: "Key is required" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Field name" />
                  </Form.Item>
                  <Form.Item name={[field.name, "value"]} style={{ marginBottom: 0 }}>
                    <Input placeholder="Field value" />
                  </Form.Item>
                  <Button danger onClick={() => remove(field.name)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </div>
            <Button onClick={() => add({ key: "", value: "" })}>Add Dynamic Field</Button>
          </>
        )}
      </Form.List>

      <Space style={{ marginTop: 20 }}>
        <Button htmlType="submit" type="primary" loading={loading}>
          Save Customer
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </Form>
  );
}
