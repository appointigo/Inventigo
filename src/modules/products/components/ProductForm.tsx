"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Form, Input, InputNumber, Select, Switch, Button, Steps, Space, Divider, Card, Empty, Tooltip, Upload, Image, message, Flex, Row, Col, Alert, Typography } from "antd";
import { ReloadOutlined, UploadOutlined, DeleteOutlined, CameraOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import { upload } from "@vercel/blob/client";
import type { UploadRequestOption } from "@rc-component/upload/lib/interface";
import type { Product, ProductFormValues } from "../types";
import type { Category } from "@/modules/categories/types";
import type { Brand } from "@/modules/brands/types";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";

const CameraBarcodeScannerModal = dynamic(
  () => import("@/modules/barcode/components/CameraBarcodeScannerModal"),
  { ssr: false }
);
import { COLOR_PALETTE } from "@/modules/categories/components/AttributeSchemaBuilder";

const { Text } = Typography;

// ─── SKU Helpers ──────────────────────────────────────────────────────────────

const abbrevName = (name: string): string => {
  const words = name.split(/[\s\-_]+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  const upper = (words[0] ?? "XX").toUpperCase();
  const consonants = upper.replace(/[AEIOU]/g, "");

  if (consonants.length >= 2) return consonants.slice(0, 2);
  if (consonants.length === 1) return consonants + (upper[1] ?? upper[0]);
  
  return upper.slice(0, 2);
};

const generateSku = (brandName: string, categoryName: string): string =>
  `${abbrevName(brandName)}-${abbrevName(categoryName)}-${Math.floor(Math.random() * 900) + 100}`;

// ─── ProductForm ──────────────────────────────────────────────────────────────
interface ProductFormProps {
  initialValues?: Product | null;
  categories: Category[];
  brands: Brand[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ProductForm = ({ initialValues, categories, brands, onSubmit, onCancel, loading }: ProductFormProps) => {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [skuTouched, setSkuTouched] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [barcodeChecking, setBarcodeChecking] = useState(false);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const isEdit = !!initialValues;

  const { suppliers } = useSuppliers();

  // Watched fields
  const imageUrl = Form.useWatch<string | undefined>("imageUrl", form);
  const selectedCategoryId = Form.useWatch<string | undefined>("categoryId", form);
  const selectedBrandId = Form.useWatch<string | undefined>("brandId", form);
  const watchedSizes = Form.useWatch<{ sizeId: string; quantity: number }[] | undefined>("sizes", form);
  const watchedAttrQty = Form.useWatch<number | null | undefined>(["attributes", "quantity"], form);
  const basePrice = Form.useWatch<number | undefined>("basePrice", form);
  const costPrice = Form.useWatch<number | undefined>("costPrice", form);

  const allocatedQty = (watchedSizes ?? []).reduce((sum, s) => sum + (Number(s?.quantity) || 0), 0);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const categoryHasQtyAttr =
    selectedCategory?.attributeSchema.fields.some(
      (f) => f.name === "quantity" && f.type === "number"
    ) ?? false;
  const totalBudget = categoryHasQtyAttr && typeof watchedAttrQty === "number" ? watchedAttrQty : null;
  const remainingQty = totalBudget !== null ? totalBudget - allocatedQty : null;
  const isOverAllocated = remainingQty !== null && remainingQty < 0;

  // Pricing signals
  const profitAmount = basePrice !== undefined && costPrice !== undefined ? basePrice - costPrice : null;
  const profitMargin = basePrice && basePrice > 0 && costPrice !== undefined
    ? ((basePrice - costPrice) / basePrice) * 100
    : null;
  const isPricingWarning = basePrice !== undefined && costPrice !== undefined && costPrice > basePrice;

  const marginColor = profitMargin === null ? "#8c8c8c"
    : profitMargin < 0 ? "#cf1322"
    : profitMargin < 20 ? "#d48806"
    : "#389e0d";

  // Auto-generate SKU when brand + category are both selected (new product only)
  useEffect(() => {
    if (isEdit || skuTouched) return;
    if (!selectedBrandId || !selectedCategoryId) return;

    const brand = brands.find((b) => b.id === selectedBrandId);
    const category = categories.find((c) => c.id === selectedCategoryId);

    if (brand && category) form.setFieldValue("sku", generateSku(brand.name, category.name));
  }, [selectedBrandId, selectedCategoryId, isEdit, skuTouched, brands, categories, form]);

  // Populate form when editing
  useEffect(() => {
    if (initialValues) {
      const attrs = (initialValues.attributes ?? {}) as Record<string, unknown>;
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
        unit: (attrs.unit as string) ?? undefined,
        supplierId: (attrs.supplierId as string) ?? undefined,
        attributes: Object.fromEntries(
          Object.entries(attrs).filter(([k]) => k !== "unit" && k !== "supplierId")
        ),
        sizes: initialValues.stock.map((s) => ({
          sizeId: s.sizeId,
          quantity: s.quantity,
          reorderLevel: s.reorderLevel,
        })),
      });
    } 
    else {
      form.resetFields();
      setSkuTouched(false);
    }
  }, [initialValues, form]);

  // Sync size rows when category changes (new product only)
  useEffect(() => {
    if (!selectedCategory || isEdit) return;

    const categoryIds = new Set(selectedCategory.sizes.map((s) => s.id));
    const current: { sizeId: string; quantity: number; reorderLevel?: number }[] = form.getFieldValue("sizes") ?? [];
    const kept = current.filter((s) => categoryIds.has(s.sizeId));
    const presentIds = new Set(kept.map((s) => s.sizeId));
    const newEntries = selectedCategory.sizes
      .filter((sz) => !presentIds.has(sz.id))
      .map((sz) => ({ sizeId: sz.id, quantity: 0, reorderLevel: 5 }));
    form.setFieldValue("sizes", [...kept, ...newEntries]);
  }, [selectedCategory, isEdit, form]);

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

  /** Validates EAN-13 / UPC-A format and checks for duplicate barcodes */
  const validateBarcode = useCallback(
    async (_: unknown, value: string): Promise<void> => {
      if (!value) return;
      // Skip if unchanged in edit mode
      if (isEdit && initialValues?.externalBarcode === value) return;

      const digits = value.replace(/\D/g, "");
      if (digits.length !== 12 && digits.length !== 13) {
        return Promise.reject(new Error("Barcode must be 12 digits (UPC-A) or 13 digits (EAN-13)"));
      }

      setBarcodeChecking(true);
      try {
        const res = await fetch(`/api/barcode/lookup?sku=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json() as { product?: { id: string } };
          if (data.product && data.product.id !== initialValues?.id) {
            return Promise.reject(new Error("This barcode is already assigned to another product"));
          }
        }
        // 404 = not found = OK (no duplicate)
      } 
      catch (err) {
        console.error("validateBarcode error: ", err);
      }
      finally {
        setBarcodeChecking(false);
      }
    },
    [isEdit, initialValues]
  );

  const handleNext = async () => {
    try {
      if (step === 0) {
        await form.validateFields(["name", "sku", "categoryId", "brandId", "basePrice", "costPrice"]);
      }
      setStep(step + 1);
    } 
    catch {
      // inline validation shown by Ant Design
    }
  };

  /** Builds the final ProductFormValues, merging unit/supplierId into attributes */
  const buildSubmitValues = async (isDraft = false): Promise<ProductFormValues | null> => {
    try {
      const fieldsToValidate = isDraft
        ? ["name", "sku", "categoryId", "brandId", "basePrice", "costPrice"]
        : undefined;
      const values = await form.validateFields(fieldsToValidate);

      const sizes = (
        (values.sizes ?? []) as {
          sizeId: string;
          quantity: number | string;
          reorderLevel?: number | string;
        }[]
      ).map((s) => ({
        sizeId: s.sizeId,
        quantity: Number(s.quantity) || 0,
        reorderLevel: Number(s.reorderLevel) || 5,
      }));

      if (!isDraft) {
        if (sizes.length === 0) {
          message.error("Please add at least one size with a quantity.");
          return null;
        }
        if (!sizes.some((s) => s.quantity > 0)) {
          message.error("At least one size must have a quantity greater than 0.");
          return null;
        }
      }

      const attributes: Record<string, unknown> = {
        ...((values.attributes as Record<string, unknown>) ?? {}),
        ...(values.unit ? { unit: values.unit } : {}),
        ...(values.supplierId ? { supplierId: values.supplierId } : {}),
      };

      return {
        name: values.name as string,
        sku: values.sku as string,
        externalBarcode: values.externalBarcode as string | undefined,
        categoryId: values.categoryId as string,
        brandId: values.brandId as string,
        basePrice: values.basePrice as number,
        costPrice: values.costPrice as number,
        imageUrl: values.imageUrl as string | undefined,
        isActive: isDraft ? false : (values.isActive as boolean),
        sizes,
        attributes,
      };
    } 
    catch (error) {
      console.error("Error building submit values: ", error);
      return null;
    }
  };

  const handleFinish = async () => {
    const values = await buildSubmitValues(false);
    if (values) await onSubmit(values);
  };

  const handleSaveDraft = async () => {
    const values = await buildSubmitValues(true);
    if (values) await onSubmit(values);
  };

  const steps = [
    { title: "Basic Info" },
    { title: "Attributes" },
    { title: "Sizes & Stock" },
  ];

  return (
    <>
      <Steps current={step} items={steps} style={{ marginBottom: 24 }} size="small" />

      <Form
        form={form}
        layout="vertical"
        initialValues={{ isActive: true, attributes: {}, sizes: [] }}
      >
        {/* ═══════════ STEP 1: Basic Info ═══════════ */}
        <div style={{ display: step === 0 ? "block" : "none" }}>

          {/* 1. Product Name */}
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: "Please enter a product name" }]}
          >
            <Input placeholder="e.g. Nike Dri-FIT Running Tee" />
          </Form.Item>

          {/* 2. Brand + Category — both have inline quick-create */}
          <Space size={16} style={{ width: "100%", display: "flex" }}>
            <Form.Item
              name="brandId"
              label="Brand"
              rules={[{ required: true, message: "Select a brand" }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select brand"
                showSearch
                optionFilterProp="label"
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
                showSearch
                optionFilterProp="label"
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

          {/* 4. External Barcode — with format validation, duplicate check, and camera scan */}
          <Form.Item
            name="externalBarcode"
            label="External Barcode (EAN-13 / UPC-A)"
            tooltip="Barcode scanners send digits followed by Enter — just focus this field and scan."
            validateDebounce={600}
            rules={[{ validator: validateBarcode }]}
            extra={barcodeChecking ? "Checking for duplicate barcodes…" : "Optional · 12 digits (UPC-A) or 13 digits (EAN-13)"}
          >
            <Input
              placeholder="Scan barcode or enter 12–13 digits manually"
              onPressEnter={(e) => e.preventDefault()}
              suffix={
                <Tooltip title="Scan barcode via camera" destroyOnHidden>
                  <Button
                    type="text"
                    size="small"
                    icon={<CameraOutlined />}
                    onClick={() => setCameraScanOpen(true)}
                    style={{ height: "auto", padding: 0, display: "flex", alignItems: "center" }}
                  />
                </Tooltip>
              }
            />
          </Form.Item>

          {/* 5. Pricing */}
          <Space size={16} style={{ width: "100%", display: "flex" }}>
            <Form.Item
              name="basePrice"
              label="Selling Price (₹)"
              rules={[{ required: true, message: "Price is required" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} placeholder="1499" prefix="₹" />
            </Form.Item>

            <Form.Item
              name="costPrice"
              label="Cost Price (₹)"
              rules={[{ required: true, message: "Cost is required" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} placeholder="900" prefix="₹" />
            </Form.Item>
          </Space>

          {/* Profit margin display + pricing warning */}
          {(basePrice !== undefined || costPrice !== undefined) && (
            <div style={{ marginTop: -8, marginBottom: 16 }}>
              {isPricingWarning && (
                <Alert
                  type="warning"
                  showIcon
                  message="Selling price is lower than cost price — you'll be selling at a loss."
                  style={{ marginBottom: 8 }}
                />
              )}
              {profitMargin !== null && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 12px",
                    background: profitMargin < 0 ? "#fff2f0" : profitMargin < 20 ? "#fffbe6" : "#f6ffed",
                    border: `1px solid ${profitMargin < 0 ? "#ffccc7" : profitMargin < 20 ? "#ffe58f" : "#b7eb8f"}`,
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: marginColor, fontWeight: 600 }}>
                    Profit Margin: {profitMargin.toFixed(1)}%
                  </span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (₹{profitAmount?.toFixed(0)} / unit)
                  </Text>
                </div>
              )}
            </div>
          )}

          {/* 6. Unit + Supplier */}
          <Space size={16} style={{ width: "100%", display: "flex" }}>
            <Form.Item
              name="unit"
              label="Unit"
              tooltip="Unit of measurement for this product"
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select unit"
                allowClear
                options={[
                  { label: "Piece (pcs)", value: "pcs" },
                  { label: "Kilogram (kg)", value: "kg" },
                  { label: "Gram (g)", value: "g" },
                  { label: "Litre (L)", value: "L" },
                  { label: "Millilitre (ml)", value: "ml" },
                  { label: "Pack", value: "pack" },
                  { label: "Box", value: "box" },
                  { label: "Pair", value: "pair" },
                  { label: "Set", value: "set" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="supplierId"
              label="Supplier"
              tooltip="Default supplier for this product"
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Select supplier"
                allowClear
                showSearch
                optionFilterProp="label"
                options={suppliers
                  .filter((s) => s.isActive)
                  .map((s) => ({ label: s.name, value: s.id }))}
              />
            </Form.Item>
          </Space>

          {/* 7. Image — drag & drop with preview and remove */}
          <Form.Item name="imageUrl" noStyle>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item label="Product Image">
            <Upload.Dragger
              accept="image/jpeg,image/png,image/webp,image/gif"
              showUploadList={false}
              customRequest={handleImageUpload}
              disabled={imageUploading}
              maxCount={1}
            >
              {imageUrl ? (
                <div onClick={(e) => e.stopPropagation()} style={{ padding: "8px 0" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <Image
                      src={imageUrl}
                      alt="Product image preview"
                      width={120}
                      height={120}
                      style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #f0f0f0" }}
                      preview={{ src: imageUrl }}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "rgba(255,255,255,0.9)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        form.setFieldValue("imageUrl", undefined);
                      }}
                    />
                  </div>
                  <p style={{ marginTop: 8, color: "#888", fontSize: 12 }}>
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 24, color: "#1677ff" }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontSize: 13 }}>
                    Click or drag image here to upload
                  </p>
                  <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                    Max 5 MB · JPEG, PNG, WebP, GIF
                  </p>
                </>
              )}
            </Upload.Dragger>
          </Form.Item>

          {/* 8. Product Status — labelled switch with tooltip */}
          <Form.Item
            name="isActive"
            label="Product Status"
            valuePropName="checked"
            tooltip="Inactive products will not appear in POS or sales"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </div>

        {/* ═══════════ STEP 2: Dynamic Attributes ═══════════ */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          {!selectedCategory ? (
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
              {selectedCategory.attributeSchema.fields.map((field) => {
                const isColorField = field.name.trim().toLowerCase() === "color" && field.type === "select";
                return (
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
                        showSearch={true}
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            .toString()
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        optionRender={isColorField ? (opt) => {
                          // Color swatch for color dropdown
                          const colorHex = COLOR_PALETTE.find((c) => c.name.toLowerCase() === String(opt.value).toLowerCase())?.hex;
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                display: "inline-block",
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: colorHex ?? "#ccc",
                                border: "1px solid rgba(0,0,0,0.15)",
                                flexShrink: 0,
                                verticalAlign: "middle",
                              }} />
                              {String(opt.label)}
                            </span>
                          );
                        } : undefined}
                      />
                    ) : field.type === "number" ? (
                      <InputNumber style={{ width: "100%" }} placeholder={`Enter ${field.name}`} />
                    ) : (
                      <Input placeholder={`Enter ${field.name}`} />
                    )}
                  </Form.Item>
                );
              })}
            </Card>
          )}
        </div>

        {/* ═══════════ STEP 3: Sizes & Stock ═══════════ */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          {!selectedCategory ? (
            <Empty description="Select a category first to see available sizes" />
          ) : selectedCategory.sizes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="This category has no sizes defined"
            />
          ) : (
            <>
              {/* Budget summary banner */}
              {totalBudget !== null && (
                <div
                  style={{
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: 8,
                    padding: "10px 16px",
                    marginBottom: 16,
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    fontSize: 13,
                  }}
                >
                  <span>Total qty: <strong>{totalBudget}</strong></span>
                  <span>
                    Allocated:{" "}
                    <strong style={{ color: isOverAllocated ? "#ff4d4f" : "#52c41a" }}>
                      {allocatedQty}
                    </strong>
                  </span>
                  <span style={{ color: isOverAllocated ? "#ff4d4f" : undefined }}>
                    Available:{" "}
                    <strong style={{ color: isOverAllocated ? "#ff4d4f" : "#1677ff" }}>
                      {remainingQty}
                    </strong>
                    {isOverAllocated && (
                      <span style={{ marginLeft: 6 }}>⚠ over by {Math.abs(remainingQty!)}</span>
                    )}
                  </span>
                </div>
              )}
              <p style={{ marginBottom: 16, color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                Enter the available quantity and reorder level for each size.
                Leave quantity at 0 for sizes you don&apos;t stock.
              </p>
              <Form.List name="sizes">
                {(fields, { remove, add }) => (
                  <>
                    {/* Column headers */}
                    <Row gutter={16} style={{ marginBottom: 8 }}>
                      <Col span={6}><span style={{ fontWeight: 500 }}>Size</span></Col>
                      <Col span={7}><span style={{ fontWeight: 500 }}>Quantity</span></Col>
                      <Col span={7}>
                        <Tooltip title="Send low-stock alert when quantity drops below this level">
                          <span style={{ fontWeight: 500, borderBottom: "1px dashed #999", cursor: "help" }}>
                            Reorder Level
                          </span>
                        </Tooltip>
                      </Col>
                    </Row>
                    {fields.map((field) => {
                      const sizeId = form.getFieldValue(["sizes", field.name, "sizeId"]) as string;
                      const sizeLabel =
                        selectedCategory.sizes.find((s) => s.id === sizeId)?.label ?? sizeId;
                      return (
                        <Row key={field.key} gutter={16} align="middle" style={{ marginBottom: 12 }}>
                          <Col span={6}>
                            <span style={{ fontSize: 15 }}>{sizeLabel}</span>
                            <Form.Item name={[field.name, "sizeId"]} noStyle>
                              <Input type="hidden" />
                            </Form.Item>
                          </Col>
                          <Col span={7}>
                            <Form.Item
                              name={[field.name, "quantity"]}
                              noStyle
                              rules={[{ required: true, message: "" }]}
                            >
                              <InputNumber
                                min={0}
                                style={{ width: "100%" }}
                                placeholder="0"
                                suffix={
                                  <Text type="secondary" style={{ fontSize: 12 }}>units</Text>
                                }
                              />
                            </Form.Item>
                          </Col>
                          <Col span={7}>
                            <Form.Item name={[field.name, "reorderLevel"]} noStyle>
                              <InputNumber min={0} style={{ width: "100%" }} placeholder="5" />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Button type="text" danger size="small" onClick={() => remove(field.name)}>
                              Remove
                            </Button>
                          </Col>
                        </Row>
                      );
                    })}
                    {/* Add Size button */}
                    <Button
                      type="dashed"
                      block
                      onClick={() => {
                        // Find the next size that's not already added
                        const currentSizeIds = new Set(
                          (form.getFieldValue("sizes") ?? []).map((s: { sizeId: string }) => s.sizeId)
                        );
                        const availableSize = selectedCategory.sizes.find((s) => !currentSizeIds.has(s.id));
                        if (availableSize) {
                          add({ sizeId: availableSize.id, quantity: 0, reorderLevel: 5 });
                        }
                      }}
                      style={{ marginTop: 12, marginBottom: 12 }}
                    >
                      + Add Size
                    </Button>
                    {/* Totals row */}
                    <Divider style={{ margin: "12px 0" }} />
                    <Row gutter={16}>
                      <Col span={6}><strong>Total Allocated</strong></Col>
                      <Col span={7}>
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
                        <Col span={7}>
                          <span style={{ color: isOverAllocated ? "#ff4d4f" : "rgba(0,0,0,0.45)", fontSize: 13 }}>
                            Remaining: {remainingQty} units
                          </span>
                        </Col>
                      )}
                    </Row>
                  </>
                )}
              </Form.List>
            </>
          )}
        </div>
      </Form>

      <Divider />

      {/* Action Bar */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
        <Button onClick={onCancel}>Cancel</Button>
        <Space wrap>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          <Tooltip
            title="Save product as inactive — you can activate it later"
            destroyOnHidden
          >
            <Button onClick={handleSaveDraft} loading={loading}>
              Save as Draft
            </Button>
          </Tooltip>
          {step < steps.length - 1 ? (
            <Button type="primary" onClick={handleNext}>
              Save &amp; Continue
            </Button>
          ) : (
            <Button type="primary" onClick={handleFinish} loading={loading}>
              {isEdit ? "Update Product" : "Create Product"}
            </Button>
          )}
        </Space>
      </Flex>

      {cameraScanOpen && (
        <CameraBarcodeScannerModal
          open={cameraScanOpen}
          onScan={(decodedText) => {
            form.setFieldValue("externalBarcode", decodedText);
          }}
          onClose={() => setCameraScanOpen(false)}
        />
      )}
    </>
  );
};

export default ProductForm;
