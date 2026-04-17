"use client";

import { Descriptions, Table, Tag, Badge, Card, Space, Button, Typography, Flex, Row, Col } from "antd";
import { EditOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Product, ProductStockSize } from "../types";
import BarcodeGenerator from "@/modules/barcode/components/BarcodeGenerator";
import LabelPrinter from "@/modules/barcode/components/LabelPrinter";
import { buildVariantSku } from "@/shared/services/barcodeService";

interface ProductDetailProps {
  product: Product;
  onEdit: () => void;
  onBack: () => void;
}

const { Item } = Descriptions;

const ProductDetail = ({ product, onEdit, onBack }: ProductDetailProps) => {
  const variants = product.stock.map((s) => {
    // Generate deterministic EAN-13 for variant
    const ean13 = buildVariantSku(product.sku, s.sizeLabel);
    return {
      variantSku: s.variantSku ?? ean13,
      sizeLabel: s.sizeLabel,
      ean13,
    };
  });

  const stockColumns: ColumnsType<ProductStockSize> = [
    { title: "Size", dataIndex: "sizeLabel", width: 80 },
    {
      title: "Variant SKU",
      dataIndex: "variantSku",
      width: 140,
      render: (v: string | null) => v ? <Tag>{v}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Barcode",
      dataIndex: "variantSku",
      key: "barcode",
      width: 180,
      render: (_, record: ProductStockSize) => {
        // Generate EAN-13 from product SKU + size label
        const ean13 = buildVariantSku(product.sku, record.sizeLabel);
        return (
          <div style={{ lineHeight: 0 }}>
            <BarcodeGenerator value={ean13} height={32} width={150} fontSize={9} />
          </div>
        );
      },
    },
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
          <LabelPrinter
            productName={product.name}
            variants={variants}
          />
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        </Space>
      </Flex>

      {/* Barcodes by Size */}
      <Card size="small" title="Barcodes by Size">
        <Row gutter={[16, 16]}>
          {product.stock.map((s) => {
            // Generate deterministic EAN-13 for each variant
            const ean13 = buildVariantSku(product.sku, s.sizeLabel);
            return (
              <Col key={s.sizeId} xs={24} sm={12} md={8} style={{ textAlign: "center" }}>
                <Tag color="blue" style={{ marginBottom: 6, fontSize: 13 }}>{s.sizeLabel}</Tag>
                <div style={{ display: "inline-block" }}>
                  <BarcodeGenerator value={ean13} height={42} width={150} fontSize={10} />
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card>
        <Descriptions
          title={product.name}
          column={{ xs: 1, sm: 2 }}
          bordered
          size="small"
        >
          <Item label="SKU">{product.sku}</Item>
          <Item label="External Barcode">
            {product.externalBarcode ?? <Typography.Text type="secondary">—</Typography.Text>}
          </Item>
          <Item label="Status">
            <Tag color={product.isActive ? "green" : "default"}>
              {product.isActive ? "Active" : "Inactive"}
            </Tag>
          </Item>
          <Item label="Category">
            <Tag>{product.categoryName}</Tag>
          </Item>
          <Item label="Brand">{product.brandName}</Item>
          <Item label="Selling Price">
            ₹{product.basePrice.toLocaleString("en-IN")}
          </Item>
          <Item label="Cost Price">
            ₹{product.costPrice.toLocaleString("en-IN")}
          </Item>
          <Item label="Margin">
            ₹{(product.basePrice - product.costPrice).toLocaleString("en-IN")}{" "}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ({((product.basePrice - product.costPrice) / product.basePrice * 100).toFixed(1)}%)
            </Typography.Text>
          </Item>
          <Item label="Total Stock">
            <Badge
              color={product.totalStock === 0 ? "red" : product.totalStock <= 10 ? "orange" : "green"}
              text={product.totalStock}
            />
          </Item>
          {
            Object.entries(product.attributes).map(([key, value]) => (
              <Item key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                {String(value)}
              </Item>
            ))
          }
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

export default ProductDetail;