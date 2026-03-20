"use client";

import { Descriptions, Table, Tag, Badge, Card, Space, Button, Typography, Flex } from "antd";
import { EditOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Product, ProductStockSize } from "../types";
import BarcodeGenerator from "@/modules/barcode/components/BarcodeGenerator";
import LabelPrinter from "@/modules/barcode/components/LabelPrinter";

interface ProductDetailProps {
  product: Product;
  onEdit: () => void;
  onBack: () => void;
}

export default function ProductDetail({ product, onEdit, onBack }: ProductDetailProps) {
  const stockColumns: ColumnsType<ProductStockSize> = [
    { title: "Size", dataIndex: "sizeLabel", width: 80 },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 100,
      align: "center",
      render: (qty: number) => {
        const color = qty === 0 ? "red" : qty <= 5 ? "orange" : "green";
        return <Badge color={color} text={qty} />;
      },
    },
    {
      title: "Reorder Level",
      dataIndex: "reorderLevel",
      width: 120,
      align: "center",
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (record.quantity === 0) return <Tag color="red">Out of Stock</Tag>;
        if (record.quantity <= record.reorderLevel) return <Tag color="orange">Low Stock</Tag>;
        return <Tag color="green">In Stock</Tag>;
      },
    },
  ];

  return (
    <Space orientation="vertical" size={24} style={{ width: "100%" }}>
      <Flex justify="space-between" align="center">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back to Products
        </Button>
        <Space>
          <LabelPrinter sku={product.sku} productName={product.name} price={product.basePrice} />
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        </Space>
      </Flex>

      {/* Barcode Section */}
      <Card size="small">
        <div style={{ textAlign: "center" }}>
          <BarcodeGenerator value={product.sku} height={50} />
        </div>
      </Card>

      <Card>
        <Descriptions
          title={product.name}
          column={{ xs: 1, sm: 2 }}
          bordered
          size="small"
        >
          <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={product.isActive ? "green" : "default"}>
              {product.isActive ? "Active" : "Inactive"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            <Tag>{product.categoryName}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Brand">{product.brandName}</Descriptions.Item>
          <Descriptions.Item label="Selling Price">
            ₹{product.basePrice.toLocaleString("en-IN")}
          </Descriptions.Item>
          <Descriptions.Item label="Cost Price">
            ₹{product.costPrice.toLocaleString("en-IN")}
          </Descriptions.Item>
          <Descriptions.Item label="Margin">
            ₹{(product.basePrice - product.costPrice).toLocaleString("en-IN")}{" "}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ({((product.basePrice - product.costPrice) / product.basePrice * 100).toFixed(1)}%)
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Total Stock">
            <Badge
              color={product.totalStock === 0 ? "red" : product.totalStock <= 10 ? "orange" : "green"}
              text={product.totalStock}
            />
          </Descriptions.Item>
          {Object.entries(product.attributes).map(([key, value]) => (
            <Descriptions.Item key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
              {String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>

      <Card title="Stock by Size" size="small">
        <Table
          columns={stockColumns}
          dataSource={product.stock}
          rowKey="sizeId"
          pagination={false}
          size="small"
        />
      </Card>
    </Space>
  );
}
