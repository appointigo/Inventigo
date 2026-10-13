"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Supplier } from "@/modules/suppliers/types";
import type { Brand } from "@/modules/brands/types";
import type { Category } from "@/modules/categories/types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { PurchaseOrderLineInput } from "../types";
import styles from "./PurchaseWorkspace.module.css";

type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  brandName: string;
  categoryName: string;
  costPrice: number;
  variants: Array<{ sizeId: string; sizeLabel: string; variantSku: string; storeQuantity: number }>;
};
type Line = PurchaseOrderLineInput & {
  key: string;
  label: string;
  variantLabel: string;
  indicator: "Existing" | "New";
};

interface Props {
  storeId: string;
  suppliers: Supplier[];
  brands: Brand[];
  categories: Category[];
  onSubmit: (
    values: {
      supplierId: string;
      notes?: string;
      deliveryInstructions?: string;
      orderDate: string;
      expectedDeliveryDate?: string;
      items: PurchaseOrderLineInput[];
    },
    issue: boolean
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  prefill?: { supplierId?: string; productId: string; sizeId: string; quantity: number };
}

export default function POForm({
  storeId,
  suppliers,
  brands,
  categories,
  onSubmit,
  onCancel,
  loading,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [existingForm] = Form.useForm();
  const [provisionalForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [lines, setLines] = useState<Line[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [existingOpen, setExistingOpen] = useState(false);
  const [provisionalOpen, setProvisionalOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [issue, setIssue] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCatalog = async (search = "") => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ storeId, pageSize: "30" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/purchase-orders/catalog?${params}`);
      if (!response.ok) throw new Error("Catalog search failed");
      setCatalog((await response.json()).items ?? []);
    } catch {
      message.error("Unable to search the product catalog");
    } finally {
      setCatalogLoading(false);
    }
  };
  useEffect(() => {
    void searchCatalog();
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProduct = catalog.find((product) => product.id === selectedProductId);
  const totals = useMemo(
    () => ({
      units: lines.reduce((sum, line) => sum + line.quantity, 0),
      amount: lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    }),
    [lines]
  );
  const addLine = (line: Line) => {
    const duplicate = lines.some(
      (candidate) =>
        candidate.itemKind !== "PROVISIONAL_PRODUCT" &&
        line.itemKind !== "PROVISIONAL_PRODUCT" &&
        candidate.productId === line.productId &&
        candidate.sizeId === line.sizeId
    );
    if (duplicate) return message.warning("That catalog variant is already on the order");
    setLines((current) => [...current, line]);
  };
  const submit = async () => {
    const values = await form.validateFields();
    if (!lines.length) return message.error("Add at least one line item");
    await onSubmit(
      {
        supplierId: values.supplierId,
        notes: values.notes,
        deliveryInstructions: values.deliveryInstructions,
        orderDate: values.orderDate.format("YYYY-MM-DD"),
        expectedDeliveryDate: values.expectedDeliveryDate?.format("YYYY-MM-DD"),
        items: lines.map(
          ({ key: _key, label: _label, variantLabel: _variant, indicator: _indicator, ...line }) => {
            void _key; void _label; void _variant; void _indicator;
            return line;
          }
        ),
      },
      issue
    );
  };
  const createFullProduct = async () => {
    const values = await productForm.validateFields();
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        sku: values.sku,
        categoryId: values.categoryId,
        brandId: values.brandId,
        mrp: values.sellingPrice,
        basePrice: values.sellingPrice,
        costPrice: values.unitCost,
        attributes: values.attributes ?? {},
        imageUrl: values.imageUrl || null,
        isActive: true,
        storeId,
        sizes: [],
      }),
    });
    const result = await response.json();
    if (!response.ok) return message.error(result.error || "Unable to create product");
    const category = categories.find((item) => item.id === values.categoryId);
    const size = category?.sizes.find((item) => item.id === values.sizeId);
    addLine({
      key: crypto.randomUUID(),
      indicator: "New",
      label: values.name,
      variantLabel: size?.label ?? "Unspecified",
      productId: result.id,
      sizeId: values.sizeId,
      quantity: values.quantity,
      unitCost: values.unitCost,
      supplierReference: values.supplierReference,
      notes: values.notes,
    });
    setProductOpen(false);
    productForm.resetFields();
    void searchCatalog();
    message.success("Product created without adding inventory and linked to this PO");
  };
  const importCsv = async (file: File) => {
    const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
    const imported: Line[] = [];
    const errors: string[] = [];
    rows.slice(1).forEach((row, index) => {
      const [description, quantityRaw, costRaw, brandId, categoryId, sizeLabel] = row
        .split(",")
        .map((value) => value.trim());
      const quantity = Number(quantityRaw);
      const unitCost = Number(costRaw);
      if (
        !description ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitCost) ||
        unitCost < 0
      )
        errors.push(
          `Row ${index + 2}: description, positive whole quantity and unit cost are required`
        );
      else
        imported.push({
          key: crypto.randomUUID(),
          indicator: "New",
          label: description,
          variantLabel: sizeLabel || "Unspecified",
          itemKind: "PROVISIONAL_PRODUCT",
          productName: description,
          brandId: brandId || undefined,
          categoryId: categoryId || undefined,
          sizeLabel: sizeLabel || undefined,
          quantity,
          unitCost,
        });
    });
    if (errors.length) message.error(errors.slice(0, 3).join(" · "));
    if (imported.length) {
      setLines((current) => [...current, ...imported]);
      message.success(`${imported.length} line(s) imported`);
    }
    return false;
  };
  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(
        [
          "description,quantity,unitCost,brandId,categoryId,sizeLabel\nAssorted product,10,100,,,\n",
        ],
        { type: "text/csv" }
      )
    );
    link.download = "stockiva-po-lines-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const columns: ColumnsType<Line> = [
    {
      title: "Product / Description",
      dataIndex: "label",
      width: 240,
      render: (value, row) => (
        <div>
          <strong>{value}</strong>
          <div style={{ color: "#7b879b", fontSize: 12 }}>
            {row.itemKind === "PROVISIONAL_PRODUCT"
              ? row.supplierReference || "Provisional description"
              : row.productId}
          </div>
        </div>
      ),
    },
    {
      title: "Item Type",
      dataIndex: "indicator",
      width: 105,
      render: (value) => <Tag color={value === "Existing" ? "blue" : "purple"}>{value}</Tag>,
    },
    { title: "Variant", dataIndex: "variantLabel", width: 130 },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 110,
      render: (value, row) => (
        <InputNumber
          min={1}
          value={value}
          onChange={(next) =>
            setLines((current) =>
              current.map((item) =>
                item.key === row.key ? { ...item, quantity: next ?? 1 } : item
              )
            )
          }
        />
      ),
    },
    {
      title: "Unit Cost",
      dataIndex: "unitCost",
      width: 130,
      render: (value, row) => (
        <InputNumber
          min={0}
          precision={2}
          prefix="₹"
          value={value}
          onChange={(next) =>
            setLines((current) =>
              current.map((item) =>
                item.key === row.key ? { ...item, unitCost: next ?? 0 } : item
              )
            )
          }
        />
      ),
    },
    {
      title: "Amount",
      width: 120,
      align: "right",
      render: (_, row) => formatCurrency(row.quantity * row.unitCost),
    },
    {
      title: "",
      width: 52,
      render: (_, row) => (
        <Button
          danger
          type="text"
          aria-label={`Remove ${row.label}`}
          icon={<DeleteOutlined />}
          onClick={() => setLines((current) => current.filter((item) => item.key !== row.key))}
        />
      ),
    },
  ];

  return (
    <Form form={form} layout="vertical" initialValues={{ orderDate: dayjs() }} onFinish={submit}>
      <div className={styles.formLayout}>
        <div>
          <Card title="Supplier information" className={styles.panel} style={{ marginBottom: 16 }}>
            <div className={styles.formGrid}>
              <Form.Item
                name="supplierId"
                label="Supplier"
                rules={[{ required: true, message: "Select a supplier" }]}
              >
                <Select
                  showSearch={{ optionFilterProp: "label" }}
                  options={suppliers
                    .filter((item) => item.isActive)
                    .map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Select supplier"
                />
              </Form.Item>
              <Form.Item label="Receiving store">
                <Input value="Current selected store" disabled />
              </Form.Item>
              <Form.Item name="orderDate" label="Order date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="expectedDeliveryDate" label="Expected delivery date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Internal or supplier notes" />
              </Form.Item>
              <Form.Item name="deliveryInstructions" label="Delivery instructions">
                <Input.TextArea rows={3} placeholder="Receiving hours, gate or contact details" />
              </Form.Item>
            </div>
          </Card>
          <Card
            title="Line items"
            className={styles.panel}
            extra={
              <Space wrap>
                <Button icon={<SearchOutlined />} onClick={() => setExistingOpen(true)}>
                  Add Existing Product
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => setProvisionalOpen(true)}>
                  Add New / Provisional
                </Button>
                <Button onClick={() => setProductOpen(true)}>Create Full Product</Button>
                <Upload accept=".csv" showUploadList={false} beforeUpload={importCsv}>
                  <Button icon={<UploadOutlined />}>Import CSV</Button>
                </Upload>
                <Button type="link" icon={<DownloadOutlined />} onClick={downloadTemplate}>
                  Template
                </Button>
              </Space>
            }
          >
            <div className={styles.tableWrap}>
              <Table
                columns={columns}
                dataSource={lines}
                rowKey="key"
                pagination={false}
                scroll={{ x: 900 }}
                locale={{
                  emptyText:
                    "Add an existing catalog product or a provisional supplier description",
                }}
              />
            </div>
          </Card>
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            message="Creating or issuing a Purchase Order will not update inventory. Stock is updated only after goods receiving is confirmed."
          />
        </div>
        <aside className={styles.sticky}>
          <Card title="Order summary" className={styles.panel}>
            <div className={styles.metric}>
              <span>Ordered units</span>
              <strong>{totals.units}</strong>
            </div>
            <div className={styles.metric}>
              <span>Subtotal</span>
              <strong>{formatCurrency(totals.amount)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Discount</span>
              <span>—</span>
            </div>
            <div className={styles.metric}>
              <span>Tax</span>
              <span>—</span>
            </div>
            <div className={styles.metric}>
              <strong>Estimated total</strong>
              <strong>{formatCurrency(totals.amount)}</strong>
            </div>
            <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
              <Button block onClick={onCancel}>
                Cancel
              </Button>
              <Button block htmlType="submit" loading={loading} onClick={() => setIssue(false)}>
                Save Draft
              </Button>
              <Button
                block
                type="primary"
                htmlType="submit"
                loading={loading}
                onClick={() => setIssue(true)}
              >
                Issue Purchase Order
              </Button>
            </Space>
          </Card>
        </aside>
      </div>

      <Modal
        title="Add existing catalog product"
        open={existingOpen}
        onCancel={() => setExistingOpen(false)}
        onOk={async () => {
          const values = await existingForm.validateFields();
          const product = catalog.find((item) => item.id === values.productId)!;
          const variant = product.variants.find((item) => item.sizeId === values.sizeId)!;
          addLine({
            key: crypto.randomUUID(),
            indicator: "Existing",
            label: `${product.name} · ${product.sku}`,
            variantLabel: `${variant.sizeLabel} · stock ${variant.storeQuantity}`,
            productId: product.id,
            sizeId: variant.sizeId,
            quantity: values.quantity,
            unitCost: values.unitCost,
            supplierReference: values.supplierReference,
          });
          setExistingOpen(false);
          existingForm.resetFields();
          setSelectedProductId(undefined);
        }}
        okText="Add line"
      >
        <Form form={existingForm} layout="vertical">
          <Form.Item label="Search">
            <Input.Search
              loading={catalogLoading}
              onChange={(event) => {
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(() => void searchCatalog(event.target.value), 250);
              }}
              placeholder="Name, SKU, brand or category"
            />
          </Form.Item>
          <Form.Item name="productId" label="Product" rules={[{ required: true }]}>
            <Select
              loading={catalogLoading}
              showSearch={{ optionFilterProp: "label" }}
              onChange={(value) => {
                setSelectedProductId(value);
                existingForm.setFieldValue("sizeId", undefined);
                const product = catalog.find((item) => item.id === value);
                existingForm.setFieldValue("unitCost", product?.costPrice);
              }}
              options={catalog.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.sku} · ${item.brandName}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="sizeId" label="Variant" rules={[{ required: true }]}>
            <Select
              disabled={!selectedProduct}
              options={selectedProduct?.variants.map((item) => ({
                value: item.sizeId,
                label: `${item.sizeLabel} · ${item.variantSku} · stock ${item.storeQuantity}`,
              }))}
            />
          </Form.Item>
          <Space>
            <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="unitCost" label="Unit purchase cost" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} prefix="₹" />
            </Form.Item>
          </Space>
          <Form.Item name="supplierReference" label="Supplier code">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Add new / provisional item"
        open={provisionalOpen}
        onCancel={() => setProvisionalOpen(false)}
        onOk={async () => {
          const values = await provisionalForm.validateFields();
          addLine({
            key: crypto.randomUUID(),
            indicator: "New",
            label: values.productName,
            variantLabel:
              [values.colour, values.sizeLabel].filter(Boolean).join(" · ") || "Assorted / unknown",
            itemKind: "PROVISIONAL_PRODUCT",
            ...values,
          });
          setProvisionalOpen(false);
          provisionalForm.resetFields();
        }}
        okText="Add provisional line"
      >
        <Form form={provisionalForm} layout="vertical">
          <Form.Item name="productName" label="Supplier description" rules={[{ required: true }]}>
            <Input placeholder="e.g. Zara assorted jeans" />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="brandId" label="Brand hint">
              <Select
                allowClear
                options={brands.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Form.Item>
            <Form.Item name="categoryId" label="Category hint">
              <Select
                allowClear
                options={categories.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Form.Item>
            <Form.Item name="styleModel" label="Style / model">
              <Input />
            </Form.Item>
            <Form.Item name="colour" label="Colour">
              <Input />
            </Form.Item>
            <Form.Item name="sizeLabel" label="Size / pack hint">
              <Input />
            </Form.Item>
            <Form.Item name="supplierReference" label="Supplier code">
              <Input />
            </Form.Item>
            <Form.Item name="proposedSku" label="Optional proposed SKU">
              <Input />
            </Form.Item>
            <Form.Item name="expectedSellingPrice" label="Expected selling price">
              <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="unitCost" label="Estimated unit cost" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} prefix="₹" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Create full product and add to PO"
        open={productOpen}
        onCancel={() => setProductOpen(false)}
        onOk={createFullProduct}
        okText="Create without stock"
      >
        <Form form={productForm} layout="vertical">
          <div className={styles.formGrid}>
            <Form.Item name="name" label="Product name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="sku" label="Product SKU" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="brandId" label="Brand" rules={[{ required: true }]}>
              <Select options={brands.map((item) => ({ value: item.id, label: item.name }))} />
            </Form.Item>
            <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
              <Select
                onChange={() => productForm.setFieldValue("sizeId", undefined)}
                options={categories.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(before, after) => before.categoryId !== after.categoryId}
            >
              {() => (
                <Form.Item name="sizeId" label="Variant / size" rules={[{ required: true }]}>
                  <Select
                    options={categories
                      .find((item) => item.id === productForm.getFieldValue("categoryId"))
                      ?.sizes.map((size) => ({ value: size.id, label: size.label }))}
                  />
                </Form.Item>
              )}
            </Form.Item>
            <Form.Item name="quantity" label="Order quantity" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="unitCost" label="Purchase cost" rules={[{ required: true }]}>
              <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="sellingPrice"
              label="Expected selling price"
              rules={[{ required: true }]}
            >
              <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="imageUrl" label="Optional image URL">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </Form>
  );
}
