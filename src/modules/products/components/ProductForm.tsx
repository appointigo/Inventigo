"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Steps,
  Space,
  Divider,
  Card,
  Empty,
} from "antd";
import type { Product, ProductFormValues } from "../types";
import type { Category } from "@/modules/categories/types";
import type { Brand } from "@/modules/brands/types";

interface ProductFormProps {
  initialValues?: Product | null;
  categories: Category[];
  brands: Brand[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProductForm({
  initialValues,
  categories,
  brands,
  onSubmit,
  onCancel,
  loading,
}: ProductFormProps) {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const isEdit = !!initialValues;

  const selectedCategoryId = Form.useWatch("categoryId", form);
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        sku: initialValues.sku,
        externalBarcode: initialValues.externalBarcode ?? undefined,
        categoryId: initialValues.categoryId,
        brandId: initialValues.brandId,
        basePrice: initialValues.basePrice,
        costPrice: initialValues.costPrice,
        isActive: initialValues.isActive,
        imageUrl: initialValues.imageUrl ?? undefined,
        attributes: initialValues.attributes,
        sizes: initialValues.stock.map((s) => s.sizeId),
      });
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const handleNext = async () => {
    try {
      if (step === 0) {
        await form.validateFields([
          "name",
          "sku",
          "categoryId",
          "brandId",
          "basePrice",
          "costPrice",
        ]);
      }
      setStep(step + 1);
    } catch {
      // validation errors shown in form
    }
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch {
      // validation errors shown
    }
  };

  const steps = [
    { title: "Basic Info" },
    { title: "Attributes" },
    { title: "Sizes" },
  ];

  return (
    <div>
      <Steps current={step} items={steps} style={{ marginBottom: 24 }} size="small" />

      <Form
        form={form}
        layout="vertical"
        initialValues={{ isActive: true, attributes: {}, sizes: [] }}
      >
        {/* Step 1: Basic Info */}
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: "Please enter a product name" }]}
          >
            <Input placeholder="e.g. Nike Dri-FIT Running Tee" />
          </Form.Item>

          <Form.Item
            name="sku"
            label="SKU"
            rules={[{ required: true, message: "SKU is required" }]}
          >
            <Input placeholder="e.g. NK-DFT-001" />
          </Form.Item>

          <Form.Item
            name="externalBarcode"
            label="External Barcode (EAN-13 / UPC-A)"
            tooltip="Optional. Enter the manufacturer barcode so scanning the product packaging resolves to this product."
          >
            <Input placeholder="e.g. 8901030811649" />
          </Form.Item>

          <Space size={16} style={{ width: "100%", display: "flex" }}>
            <Form.Item
              name="categoryId"
              label="Category"
              rules={[{ required: true, message: "Select a category" }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select category"
                showSearch={{ optionFilterProp: "label" }}
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
              />
            </Form.Item>

            <Form.Item
              name="brandId"
              label="Brand"
              rules={[{ required: true, message: "Select a brand" }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select brand"
                showSearch={{ optionFilterProp: "label" }}
                options={brands.filter((b) => b.isActive).map((b) => ({ label: b.name, value: b.id }))}
              />
            </Form.Item>
          </Space>

          <Space size={16} style={{ width: "100%", display: "flex" }}>
            <Form.Item
              name="basePrice"
              label="Selling Price (₹)"
              rules={[{ required: true, message: "Price is required" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} placeholder="1499" />
            </Form.Item>

            <Form.Item
              name="costPrice"
              label="Cost Price (₹)"
              rules={[{ required: true, message: "Cost is required" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} placeholder="900" />
            </Form.Item>
          </Space>

          <Form.Item name="imageUrl" label="Image URL">
            <Input placeholder="https://example.com/image.jpg (optional)" />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        {/* Step 2: Dynamic Attributes from Category Schema */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          {!selectedCategory ? (
            <Empty description="Select a category first to see attribute fields" />
          ) : selectedCategory.attributeSchema.fields.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="This category has no attribute fields"
            />
          ) : (
            <Card size="small" title={`${selectedCategory.name} Attributes`}>
              {selectedCategory.attributeSchema.fields.map((field) => (
                <Form.Item
                  key={field.name}
                  name={["attributes", field.name]}
                  label={field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                  rules={
                    field.required
                      ? [{ required: true, message: `${field.name} is required` }]
                      : undefined
                  }
                >
                  {field.type === "select" ? (
                    <Select
                      placeholder={`Select ${field.name}`}
                      options={(field.options ?? []).map((o) => ({ label: o, value: o }))}
                      allowClear={!field.required}
                    />
                  ) : field.type === "number" ? (
                    <InputNumber style={{ width: "100%" }} placeholder={`Enter ${field.name}`} />
                  ) : (
                    <Input placeholder={`Enter ${field.name}`} />
                  )}
                </Form.Item>
              ))}
            </Card>
          )}
        </div>

        {/* Step 3: Select Sizes */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          {!selectedCategory ? (
            <Empty description="Select a category first to see available sizes" />
          ) : selectedCategory.sizes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="This category has no sizes defined"
            />
          ) : (
            <Form.Item
              name="sizes"
              label={`Available Sizes (${selectedCategory.name})`}
              rules={[{ required: true, message: "Select at least one size" }]}
            >
              <Select
                mode="multiple"
                placeholder="Select sizes for this product"
                options={selectedCategory.sizes.map((s) => ({
                  label: s.label,
                  value: s.id,
                }))}
              />
            </Form.Item>
          )}
        </div>
      </Form>

      <Divider />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Space>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          {step < steps.length - 1 ? (
            <Button type="primary" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="primary" onClick={handleFinish} loading={loading}>
              {isEdit ? "Update Product" : "Create Product"}
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}
