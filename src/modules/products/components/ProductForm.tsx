"use client";

import { useState, useEffect, useMemo } from "react";
import { Form, Input, InputNumber, Select, Switch, Button, Steps, Space, Divider, Card, Empty, Tooltip, Upload, Image, message, Flex, Row, Col } from "antd";
import { ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { upload } from "@vercel/blob/client";
import type { UploadRequestOption } from "@rc-component/upload/lib/interface";
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

// --- SKU helpers ---
const abbrevName = (name: string): string =>{
  const words = name.split(/[\s\-_]+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }
  // Single word: strip vowels, take first 2 consonants
  const upper = words[0].toUpperCase();
  const consonants = upper.replace(/[AEIOU]/g, "");
  if (consonants.length >= 2) return consonants.slice(0, 2);
  if (consonants.length === 1) return consonants + (upper[1] ?? upper[0]);
  return upper.slice(0, 2);
}

const generateSku = (brandName: string, categoryName: string): string => {
  const seq = Math.floor(Math.random() * 900) + 100;
  return `${abbrevName(brandName)}-${abbrevName(categoryName)}-${seq}`;
};
// --- end SKU helpers ---

const ProductForm = ({
  initialValues,
  categories,
  brands,
  onSubmit,
  onCancel,
  loading,
}: ProductFormProps) => {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [skuTouched, setSkuTouched] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const isEdit = !!initialValues;

  const imageUrl = Form.useWatch("imageUrl", form);

  const handleImageUpload = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setImageUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      form.setFieldValue("imageUrl", blob.url);
      options.onSuccess?.(blob);
    } 
    catch (err) {
      console.error(err);
      options.onError?.(err as Error);
      message.error("Image upload failed. Please try again.");
    } 
    finally {
      setImageUploading(false);
    }
  };

  const selectedCategoryId = Form.useWatch("categoryId", form);
  const selectedBrandId = Form.useWatch("brandId", form);
  const watchedSizes = Form.useWatch("sizes", form) as { sizeId: string; quantity: number }[] | undefined;
  const watchedAttrQty = Form.useWatch(["attributes", "quantity"], form) as number | null | undefined;
  const allocatedQty = (watchedSizes ?? []).reduce((sum, s) => sum + (Number(s?.quantity) || 0), 0);
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );
  // Only show budget banner if the selected category has a numeric "quantity" attribute
  const categoryHasQtyAttr = selectedCategory?.attributeSchema.fields.some(
    (f) => f.name === "quantity" && f.type === "number"
  ) ?? false;
  const totalBudget = categoryHasQtyAttr && typeof watchedAttrQty === "number" ? watchedAttrQty : null;
  const remainingQty = totalBudget !== null ? totalBudget - allocatedQty : null;
  const isOverAllocated = remainingQty !== null && remainingQty < 0;

  // Auto-generate SKU when brand + category are both selected (new product only)
  useEffect(() => {
    if (isEdit || skuTouched) return;
    if (!selectedBrandId || !selectedCategoryId) return;

    const brand = brands.find((b) => b.id === selectedBrandId);
    const category = categories.find((c) => c.id === selectedCategoryId);

    if (brand && category) {
      form.setFieldValue("sku", generateSku(brand.name, category.name));
    }
  }, [selectedBrandId, selectedCategoryId, isEdit, skuTouched, brands, categories, form]);

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
        sizes: initialValues.stock.map((s) => ({ sizeId: s.sizeId, quantity: s.quantity })),
      });
    } 
    else {
      form.resetFields();
      setSkuTouched(false);
    }
  }, [initialValues, form]);

  // Populate sizes list whenever the selected category changes (new product flow)
  useEffect(() => {
    if (!selectedCategory || isEdit) return;
    const categoryIds = new Set(selectedCategory.sizes.map((s) => s.id));
    const current: { sizeId: string; quantity: number }[] = form.getFieldValue("sizes") ?? [];
    // Remove entries that don't belong to this category, then add missing ones
    const kept = current.filter((s) => categoryIds.has(s.sizeId));
    const presentIds = new Set(kept.map((s) => s.sizeId));
    const newEntries = selectedCategory.sizes
      .filter((sz) => !presentIds.has(sz.id))
      .map((sz) => ({ sizeId: sz.id, quantity: 0 }));
    form.setFieldValue("sizes", [...kept, ...newEntries]);
  }, [selectedCategory, isEdit, form]);

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
    } 
    catch {
      // validation errors shown in form
    }
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      // Guard: at least one size must have quantity > 0
      // Coerce quantity to number (InputNumber inside Form.List can return a string)
      const sizes = ((values.sizes ?? []) as { sizeId: string; quantity: number | string }[]).map(
        (s) => ({ ...s, quantity: Number(s.quantity) || 0 })
      );
      if (sizes.length === 0) {
        message.error("Please add at least one size with a quantity.");
        return;
      }
      const hasQty = sizes.some((s) => s.quantity > 0);
      if (!hasQty) {
        message.error("At least one size must have a quantity greater than 0.");
        return;
      }
      await onSubmit({ ...values, sizes });
    } 
    catch (err) {
      console.error(err);
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
          {/* 1. Product Name */}
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: "Please enter a product name" }]}
          >
            <Input placeholder="e.g. Nike Dri-FIT Running Tee" />
          </Form.Item>

          {/* 2. Brand + Category — drives SKU auto-generation */}
          <Space size={16} style={{ width: "100%", display: "flex" }}>
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
          </Space>

          {/* 3. SKU — auto-populated once Brand + Category are selected */}
          <Form.Item
            name="sku"
            label="SKU"
            rules={[{ required: true, message: "SKU is required" }]}
            tooltip={!isEdit ? "Auto-generated from Brand & Category. You can edit it or regenerate." : undefined}
          >
            <Input
              placeholder="Select Brand & Category to auto-generate"
              onChange={() => setSkuTouched(true)}
              suffix={
                !isEdit ? (
                  <Tooltip title="Regenerate SKU" destroyOnHidden>
                    <ReloadOutlined
                      style={{
                        cursor: selectedBrandId && selectedCategoryId ? "pointer" : "default",
                        color: selectedBrandId && selectedCategoryId ? "#1677ff" : "#d9d9d9",
                      }}
                      onClick={() => {
                        const brand = brands.find((b) => b.id === selectedBrandId);
                        const category = categories.find((c) => c.id === selectedCategoryId);
                        if (brand && category) {
                          form.setFieldValue("sku", generateSku(brand.name, category.name));
                          setSkuTouched(false);
                        }
                      }}
                    />
                  </Tooltip>
                ) : null
              }
            />
          </Form.Item>

          {/* 4. External Barcode — grouped with SKU as both are barcode-related */}
          <Form.Item
            name="externalBarcode"
            label="External Barcode (EAN-13 / UPC-A)"
            tooltip="Optional. Enter the manufacturer barcode so scanning the product packaging resolves to this product."
          >
            <Input placeholder="e.g. 8901030811649" />
          </Form.Item>

          {/* 5. Pricing */}
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

          {/* 6. Image + Active */}
          <Form.Item name="imageUrl" label="Product Image">
            <Input type="hidden" />
          </Form.Item>
          <Form.Item label="Upload Image" style={{ marginTop: -16 }}>
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Upload
                accept="image/jpeg,image/png,image/webp,image/gif"
                showUploadList={false}
                customRequest={handleImageUpload}
                disabled={imageUploading}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />} loading={imageUploading}>
                  {imageUrl ? "Replace Image" : "Upload Image"}
                </Button>
              </Upload>
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt="Product image preview"
                  width={120}
                  height={120}
                  style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #f0f0f0" }}
                  preview={{ src: imageUrl }}
                />
              )}
              {!imageUrl && (
                <span style={{ color: "#999", fontSize: 12 }}>
                  Max 5 MB · JPEG, PNG, WebP, GIF
                </span>
              )}
            </Space>
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        {/* Step 2: Dynamic Attributes from Category Schema */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          {
            !selectedCategory ? (
              <Empty description="Select a category first to see attribute fields" />
            ) 
            : selectedCategory.attributeSchema.fields.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="This category has no attribute fields"
              />
            ) 
            : (
              <Card size="small" title={`${selectedCategory.name} Attributes`}>
                {
                  selectedCategory.attributeSchema.fields.map((field) => (
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
                      ) 
                      : field.type === "number" ? (
                        <InputNumber style={{ width: "100%" }} placeholder={`Enter ${field.name}`} />
                      ) 
                      : (
                        <Input placeholder={`Enter ${field.name}`} />
                      )}
                    </Form.Item>
                  ))
                }
              </Card>
            )
          }
        </div>

        {/* Step 3: Per-size Quantities */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          {
            !selectedCategory ? (
              <Empty description="Select a category first to see available sizes" />
            )
            : selectedCategory.sizes.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="This category has no sizes defined"
              />
            )
            : (
              <>
                {/* Budget summary banner */}
                {totalBudget !== null && (
                  <div style={{
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: 8,
                    padding: "10px 16px",
                    marginBottom: 16,
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    fontSize: 13,
                  }}>
                    <span>Total qty: <strong>{totalBudget}</strong></span>
                    <span>Allocated: <strong style={{ color: isOverAllocated ? "#ff4d4f" : "#52c41a" }}>{allocatedQty}</strong></span>
                    <span style={{ color: isOverAllocated ? "#ff4d4f" : undefined }}>
                      Available: <strong style={{ color: isOverAllocated ? "#ff4d4f" : "#1677ff" }}>{remainingQty}</strong>
                      {isOverAllocated && <span style={{ marginLeft: 6 }}>⚠ over by {Math.abs(remainingQty!)}</span>}
                    </span>
                  </div>
                )}
                <p style={{ marginBottom: 16, color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                  Enter the available quantity for each size. Leave 0 for sizes you don&apos;t stock.
                </p>
                <Form.List name="sizes">
                  {(fields, { remove }) => {
                    return (
                      <>
                        {/* Header row */}
                        <Row gutter={16} style={{ marginBottom: 8 }}>
                          <Col span={8}><span style={{ fontWeight: 500 }}>Size</span></Col>
                          <Col span={8}><span style={{ fontWeight: 500 }}>Quantity</span></Col>
                        </Row>
                        {fields.map((field) => {
                          const sizeId = form.getFieldValue(["sizes", field.name, "sizeId"]) as string;
                          const sizeLabel = selectedCategory.sizes.find((s) => s.id === sizeId)?.label ?? sizeId;
                          return (
                            <Row key={field.key} gutter={16} align="middle" style={{ marginBottom: 12 }}>
                              <Col span={8}>
                                <span style={{ fontSize: 15 }}>{sizeLabel}</span>
                                {/* hidden field to carry sizeId */}
                                <Form.Item name={[field.name, "sizeId"]} noStyle>
                                  <Input type="hidden" />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  name={[field.name, "quantity"]}
                                  noStyle
                                  rules={[{ required: true, message: "" }]}
                                >
                                  <Space.Compact style={{ width: "100%" }}>
                                    <InputNumber
                                      min={0}
                                      style={{ width: "100%" }}
                                      placeholder="0"
                                    />
                                    <span style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "0 11px",
                                      background: "#fafafa",
                                      border: "1px solid #d9d9d9",
                                      borderLeft: 0,
                                      borderRadius: "0 6px 6px 0",
                                      color: "rgba(0,0,0,0.45)",
                                      fontSize: 14,
                                      whiteSpace: "nowrap",
                                    }}>units</span>
                                  </Space.Compact>
                                </Form.Item>
                              </Col>
                              <Col span={4}>
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  onClick={() => remove(field.name)}
                                >
                                  Remove
                                </Button>
                              </Col>
                            </Row>
                          );
                        })}
                        {/* Total */}
                        <Divider style={{ margin: "12px 0" }} />
                        <Row gutter={16}>
                          <Col span={8}><strong>Total Allocated</strong></Col>
                          <Col span={8}>
                            <strong style={{ color: isOverAllocated ? "#ff4d4f" : undefined }}>
                              {allocatedQty} units
                            </strong>
                            {isOverAllocated && (
                              <span style={{ color: "#ff4d4f", fontSize: 12, marginLeft: 8 }}>
                                ⚠ Over by {Math.abs(remainingQty!)}
                              </span>
                            )}
                          </Col>
                          {remainingQty !== null && (
                            <Col span={8}>
                              <span style={{ color: isOverAllocated ? "#ff4d4f" : "rgba(0,0,0,0.45)", fontSize: 13 }}>
                                Remaining: {remainingQty} units
                              </span>
                            </Col>
                          )}
                        </Row>
                      </>
                    );
                  }}
                </Form.List>
              </>
            )
          }
        </div>
      </Form>

      <Divider />

      <Flex justify="space-between">
        <Button onClick={onCancel}>Cancel</Button>
        <Space>
          {
            step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>
          }
          {
            step < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                Next
              </Button>
            ) 
            : (
              <Button type="primary" onClick={handleFinish} loading={loading}>
                {isEdit ? "Update Product" : "Create Product"}
              </Button>
            )
          }
        </Space>
      </Flex>
    </div>
  );
}

export default ProductForm;