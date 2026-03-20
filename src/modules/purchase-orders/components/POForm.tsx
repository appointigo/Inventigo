"use client";

import { useState } from "react";
import { Form, Select, Input, InputNumber, Button, Space, Table, Card, App } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Supplier } from "@/modules/suppliers/types";
import type { Product } from "@/modules/products/types";
import type { POItemFormValues } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface POFormProps {
  suppliers: Supplier[];
  products: Product[];
  onSubmit: (values: { supplierId: string; notes?: string; items: POItemFormValues[] }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type LineItem = POItemFormValues & {
  key: string;
  productName?: string;
  sizeLabel?: string;
};

export default function POForm({ suppliers, products, onSubmit, onCancel, loading }: POFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>();

  const activeSuppliers = suppliers.filter((s) => s.isActive);
  const activeProducts = products.filter((p) => p.isActive);

  const selectedProductData = activeProducts.find((p) => p.id === selectedProduct);
  const availableSizes = selectedProductData?.stock?.map((s) => ({
    value: s.sizeId,
    label: s.sizeLabel,
  })) ?? [];

  const addItem = (values: { productId: string; sizeId: string; quantity: number; unitCost: number }) => {
    const product = activeProducts.find((p) => p.id === values.productId);
    const sizeInfo = product?.stock?.find((s) => s.sizeId === values.sizeId);

    const existing = lineItems.find(
      (li) => li.productId === values.productId && li.sizeId === values.sizeId
    );
    if (existing) {
      message.warning("This product + size combination already exists in the order");
      return;
    }

    const newItem: LineItem = {
      key: `${values.productId}-${values.sizeId}-${Date.now()}`,
      productId: values.productId,
      sizeId: values.sizeId,
      quantity: values.quantity,
      unitCost: values.unitCost,
      productName: product?.name,
      sizeLabel: sizeInfo?.sizeLabel,
    };

    setLineItems((prev) => [...prev, newItem]);
    setSelectedProduct(undefined);
    form.resetFields(["itemProduct", "itemSize", "itemQty", "itemCost"]);
  };

  const removeItem = (key: string) => {
    setLineItems((prev) => prev.filter((li) => li.key !== key));
  };

  const totalAmount = lineItems.reduce((sum, li) => sum + li.quantity * li.unitCost, 0);

  const handleFinish = async (formValues: { supplierId: string; notes?: string }) => {
    if (lineItems.length === 0) {
      message.error("Please add at least one line item");
      return;
    }
    await onSubmit({
      supplierId: formValues.supplierId,
      notes: formValues.notes,
      items: lineItems.map(({ productId, sizeId, quantity, unitCost }) => ({
        productId,
        sizeId,
        quantity,
        unitCost,
      })),
    });
  };

  const itemColumns = [
    { title: "Product", dataIndex: "productName", key: "product" },
    { title: "Size", dataIndex: "sizeLabel", key: "size", width: 80 },
    { title: "Qty", dataIndex: "quantity", key: "qty", width: 80, align: "center" as const },
    {
      title: "Unit Cost",
      dataIndex: "unitCost",
      key: "cost",
      width: 120,
      align: "right" as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: "Total",
      key: "total",
      width: 120,
      align: "right" as const,
      render: (_: unknown, record: LineItem) => formatCurrency(record.quantity * record.unitCost),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, record: LineItem) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} size="small" />
      ),
    },
  ];

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Card title="Order Details" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          name="supplierId"
          label="Supplier"
          rules={[{ required: true, message: "Select a supplier" }]}
        >
          <Select
            placeholder="Select supplier"
            showSearch={{ optionFilterProp: "label" }}
            options={activeSuppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional notes for this order" />
        </Form.Item>
      </Card>

      <Card title="Line Items" size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Form.Item name="itemProduct" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <Select
              placeholder="Select product"
              showSearch={{ optionFilterProp: "label" }}
              value={selectedProduct}
              onChange={setSelectedProduct}
              options={activeProducts.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
            />
          </Form.Item>
          <Form.Item name="itemSize" style={{ marginBottom: 0, width: 100 }}>
            <Select
              placeholder="Size"
              disabled={!selectedProduct}
              options={availableSizes}
            />
          </Form.Item>
          <Form.Item name="itemQty" style={{ marginBottom: 0, width: 90 }}>
            <InputNumber placeholder="Qty" min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="itemCost" style={{ marginBottom: 0, width: 120 }}>
            <InputNumber
              placeholder="Unit cost"
              min={0}
              prefix="₹"
              style={{ width: "100%" }}
              defaultValue={selectedProductData?.costPrice}
            />
          </Form.Item>
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              const product = form.getFieldValue("itemProduct");
              const size = form.getFieldValue("itemSize");
              const qty = form.getFieldValue("itemQty");
              const cost = form.getFieldValue("itemCost");
              if (!product || !size || !qty || cost === undefined || cost === null) {
                message.warning("Fill in all item fields before adding");
                return;
              }
              addItem({ productId: product, sizeId: size, quantity: qty, unitCost: cost });
            }}
          >
            Add
          </Button>
        </div>

        <Table
          columns={itemColumns}
          dataSource={lineItems}
          rowKey="key"
          pagination={false}
          size="small"
          locale={{ emptyText: "No items added yet" }}
          summary={() =>
            lineItems.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>Total ({lineItems.length} items)</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{formatCurrency(totalAmount)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>

      <div style={{ textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading} disabled={lineItems.length === 0}>
            Create Purchase Order
          </Button>
        </Space>
      </div>
    </Form>
  );
}
