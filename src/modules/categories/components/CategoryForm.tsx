"use client";

import { useEffect } from "react";
import { Form, Input, Select, Button, Space, Divider } from "antd";
import type { AttributeField, Category, CategoryFormValues } from "../types";
import AttributeSchemaBuilder from "./AttributeSchemaBuilder";

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size",
  "26", "28", "30", "32", "34", "36", "38", "40",
  "UK 6", "UK 7", "UK 8", "UK 9", "UK 10"];

const DEFAULT_FIELDS: AttributeField[] = [
  { name: "color", type: "select", required: false, options: [] },
];

interface CategoryFormProps {
  initialValues?: Category | null;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const CategoryForm = ({
  initialValues,
  onSubmit,
  onCancel,
  loading,
}: CategoryFormProps) => {
  const [form] = Form.useForm<CategoryFormValues>();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        slug: initialValues.slug,
        description: initialValues.description ?? undefined,
        attributeSchema: initialValues.attributeSchema,
        sizes: initialValues.sizes.map((s) => s.label),
      });
    } 
    else {
      form.resetFields();
      form.setFieldValue(["attributeSchema", "fields"], DEFAULT_FIELDS);
    }
  }, [initialValues, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEdit) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setFieldValue("slug", slug);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={{
        attributeSchema: { fields: DEFAULT_FIELDS },
        sizes: [],
      }}
    >
      <Form.Item
        name="name"
        label="Category Name"
        rules={[{ required: true, message: "Please enter a category name" }]}
      >
        <Input placeholder="e.g. T-Shirts" onChange={handleNameChange} />
      </Form.Item>

      <Form.Item
        name="slug"
        label="Slug"
        rules={[
          { required: true, message: "Slug is required" },
          { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "Only lowercase letters, numbers, and hyphens" },
        ]}
      >
        <Input placeholder="e.g. t-shirts" />
      </Form.Item>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={2} placeholder="Optional description" />
      </Form.Item>

      <Divider />

      <Form.Item
        name="sizes"
        label="Sizes"
        rules={[{ required: true, message: "Add at least one size" }]}
      >
        <Select
          mode="tags"
          placeholder="Type a size and press Enter (e.g. S, M, L, XL)"
          tokenSeparators={[","]}
          options={COMMON_SIZES.map((s) => ({ label: s, value: s }))}
        />
      </Form.Item>

      <Divider />

      <Form.Item
        name={["attributeSchema", "fields"]}
        label="Attribute Schema"
      >
        <AttributeSchemaBuilder />
      </Form.Item>

      <Divider />

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? "Update Category" : "Create Category"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default CategoryForm;
