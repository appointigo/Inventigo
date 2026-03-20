"use client";

import { useState, useCallback } from "react";
import {
  Typography,
  Card,
  Tabs,
  Input,
  Button,
  Descriptions,
  Tag,
  Table,
  Badge,
  Space,
  Result,
  Spin,
  App,
} from "antd";
import {
  ScanOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  ShoppingCartOutlined,
  BarcodeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import type { ColumnsType } from "antd/es/table";
import type { BarcodeLookupResult } from "@/modules/barcode/types";
import { barcodeService } from "@/modules/barcode/services/barcodeService";
import BarcodeGenerator from "@/modules/barcode/components/BarcodeGenerator";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(
  () => import("@/modules/barcode/components/BarcodeScanner"),
  { ssr: false }
);

type StockRow = BarcodeLookupResult["stockLevels"][number];

export default function ScanPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("scan");
  const [manualSku, setManualSku] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lastScanned, setLastScanned] = useState("");

  const lookupSku = useCallback(
    async (sku: string) => {
      if (!sku.trim()) return;
      setLoading(true);
      setNotFound(false);
      setResult(null);
      try {
        const data = await barcodeService.lookup(sku.trim());
        if (data) {
          setResult(data);
          setLastScanned(sku.trim());
        } else {
          setNotFound(true);
          setLastScanned(sku.trim());
        }
      } catch {
        message.error("Failed to lookup barcode");
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  const handleScan = useCallback(
    (decodedText: string) => {
      lookupSku(decodedText);
    },
    [lookupSku]
  );

  const handleManualSearch = () => {
    lookupSku(manualSku);
  };

  const resetScan = () => {
    setResult(null);
    setNotFound(false);
    setLastScanned("");
    setManualSku("");
  };

  const stockColumns: ColumnsType<StockRow> = [
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
      title: "Status",
      dataIndex: "status",
      width: 100,
      align: "center",
      render: (status: string) => {
        const colorMap: Record<string, string> = { OK: "green", LOW: "orange", OUT: "red" };
        return <Tag color={colorMap[status] ?? "default"}>{status}</Tag>;
      },
    },
  ];

  const totalStock = result?.stockLevels.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Typography.Title level={3}>
        <ScanOutlined /> Barcode Scanner
      </Typography.Title>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          resetScan();
        }}
        items={[
          {
            key: "scan",
            label: (
              <span>
                <ScanOutlined /> Camera Scan
              </span>
            ),
            children: (
              <div>
                {!result && !notFound && !loading && (
                  <BarcodeScanner onScan={handleScan} />
                )}
                {loading && (
                  <div style={{ textAlign: "center", padding: 48 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12 }}>Looking up product...</div>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "manual",
            label: (
              <span>
                <SearchOutlined /> Manual Entry
              </span>
            ),
            children: (
              <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                <Input
                  placeholder="Enter SKU (e.g. NK-DFT-001)"
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  onPressEnter={handleManualSearch}
                  prefix={<BarcodeOutlined />}
                  size="large"
                  allowClear
                />
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleManualSearch}
                  loading={loading}
                  size="large"
                >
                  Lookup
                </Button>
              </Space.Compact>
            ),
          },
        ]}
      />

      {/* Not Found */}
      {notFound && (
        <Card style={{ marginTop: 16 }}>
          <Result
            status="warning"
            title="Product Not Found"
            subTitle={`No product found for SKU: ${lastScanned}`}
            extra={
              <Button type="primary" onClick={resetScan}>
                Scan Again
              </Button>
            }
          />
        </Card>
      )}

      {/* Product Result */}
      {result && (
        <Card style={{ marginTop: 16 }}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            {/* Barcode Display */}
            <div style={{ textAlign: "center" }}>
              <BarcodeGenerator value={result.product.sku} height={40} width={1.2} />
            </div>

            {/* Product Info */}
            <Descriptions
              title={result.product.name}
              column={{ xs: 1, sm: 2 }}
              bordered
              size="small"
            >
              <Descriptions.Item label="SKU">{result.product.sku}</Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag>{result.product.categoryName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Brand">{result.product.brandName}</Descriptions.Item>
              <Descriptions.Item label="Price">
                ₹{result.product.basePrice.toLocaleString("en-IN")}
              </Descriptions.Item>
              <Descriptions.Item label="Total Stock">
                <Badge
                  color={totalStock === 0 ? "red" : totalStock <= 10 ? "orange" : "green"}
                  text={totalStock}
                />
              </Descriptions.Item>
            </Descriptions>

            {/* Stock Levels Table */}
            <Table
              columns={stockColumns}
              dataSource={result.stockLevels}
              rowKey="sizeLabel"
              pagination={false}
              size="small"
              title={() => <Typography.Text strong>Stock by Size</Typography.Text>}
            />

            {/* Quick Actions */}
            <Card size="small" title="Quick Actions">
              <Space wrap>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => router.push(`/dashboard/products/${result.product.id}`)}
                >
                  View Details
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/dashboard/stock`)}
                >
                  Adjust Stock
                </Button>
                <Button
                  icon={<ShoppingCartOutlined />}
                  onClick={() => router.push(`/dashboard/purchase-orders`)}
                >
                  Purchase Orders
                </Button>
                <Button type="primary" icon={<ScanOutlined />} onClick={resetScan}>
                  Scan Another
                </Button>
              </Space>
            </Card>
          </Space>
        </Card>
      )}
    </div>
  );
}
