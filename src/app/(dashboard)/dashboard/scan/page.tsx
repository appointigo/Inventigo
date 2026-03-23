"use client";

import { useState, useCallback } from "react";
import { Typography, Card, Tabs, Input, InputNumber, Button, Descriptions, Tag, Table, Badge, Space, Result, Spin, Select, Divider, App } from "antd";
import { ScanOutlined, SearchOutlined, EyeOutlined, EditOutlined, ShoppingCartOutlined, BarcodeOutlined, PlusCircleOutlined, DollarOutlined } from "@ant-design/icons";
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

  // Inline stock receive state
  const [receiveSize, setReceiveSize] = useState<string | undefined>(undefined);
  const [receiveQty, setReceiveQty] = useState<number>(1);
  const [receiving, setReceiving] = useState(false);

  // Inline add-to-billing state
  const [billingSize, setBillingSize] = useState<string | undefined>(undefined);
  const [billingQty, setBillingQty] = useState<number>(1);
  const [addingToBill, setAddingToBill] = useState(false);

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
        } 
        else {
          setNotFound(true);
          setLastScanned(sku.trim());
        }
      } 
      catch {
        message.error("Failed to lookup barcode");
      } 
      finally {
        setLoading(false);
      }
    }, [message]
  );

  const handleScan = useCallback(
    (decodedText: string) => {
      lookupSku(decodedText);
    }, [lookupSku]
  );

  const handleManualSearch = () => {
    lookupSku(manualSku);
  };

  const resetScan = () => {
    setResult(null);
    setNotFound(false);
    setLastScanned("");
    setManualSku("");
    setReceiveSize(undefined);
    setReceiveQty(1);
    setBillingSize(undefined);
    setBillingQty(1);
  };

  const handleReceiveStock = useCallback(async () => {
    if (!result || !receiveSize || receiveQty < 1) return;
    const sizeInfo = result.stockLevels.find((s) => s.sizeLabel === receiveSize);

    if (!sizeInfo) return;
    setReceiving(true);

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: result.product.id,
          sizeId: receiveSize,
          quantity: receiveQty,
          type: "IN",
          reason: "Stock received (scan)",
        }),
      });

      if (!res.ok) throw new Error("Failed to receive stock");
      message.success(`Received ${receiveQty} × ${result.product.name} (${receiveSize})`);

      // Re-fetch to update stock levels
      await lookupSku(result.product.sku);
      setReceiveSize(undefined);
      setReceiveQty(1);
    } 
    catch {
      message.error("Failed to receive stock");
    } 
    finally {
      setReceiving(false);
    }
  }, [result, receiveSize, receiveQty, lookupSku, message]);

  const handleAddToBilling = useCallback(async () => {
    if (!result || !billingSize || billingQty < 1) return;
    const sizeInfo = result.stockLevels.find((s) => s.sizeLabel === billingSize);

    if (!sizeInfo) return;

    if (sizeInfo.quantity < billingQty) {
      message.warning(`Only ${sizeInfo.quantity} in stock for size ${billingSize}`);
      return;
    }

    setAddingToBill(true);

    try {
      // Create a single-item quick sale
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            productId: result.product.id,
            productName: result.product.name,
            sku: result.product.sku,
            sizeId: billingSize,
            sizeLabel: billingSize,
            quantity: billingQty,
            unitPrice: result.product.basePrice,
          }],
          paymentMethod: "CASH",
          discountAmount: 0,
          taxAmount: 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to create sale");

      const sale = await res.json();
      message.success(`Quick sale created: ${sale.invoiceNumber}`);
      await lookupSku(result.product.sku);
      setBillingSize(undefined);
      setBillingQty(1);
    } 
    catch {
      message.error("Failed to create sale");
    } 
    finally {
      setAddingToBill(false);
    }
  }, [result, billingSize, billingQty, lookupSku, message]);

  const stockColumns: ColumnsType<StockRow> = [
    { title: "Size", dataIndex: "sizeLabel", width: 80 },
    {
      title: "Variant SKU",
      dataIndex: "variantSku",
      width: 130,
      render: (v: string | null) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : "—",
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
            {result.matchedVariant && (
              <Tag color="blue" style={{ fontSize: 13 }}>
                Scanned variant: Size {result.matchedVariant}
              </Tag>
            )}
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

            {/* Receive Stock Inline */}
            <Card size="small" title={<><PlusCircleOutlined /> Receive Stock</>}>
              <Space wrap style={{ width: "100%" }}>
                <Select
                  placeholder="Size"
                  value={receiveSize}
                  onChange={setReceiveSize}
                  style={{ width: 110 }}
                  options={result.stockLevels.map((s) => ({
                    label: `${s.sizeLabel} (${s.quantity})`,
                    value: s.sizeLabel,
                  }))}
                />
                <InputNumber
                  min={1}
                  max={9999}
                  value={receiveQty}
                  onChange={(v) => setReceiveQty(v ?? 1)}
                  style={{ width: 90 }}
                  placeholder="Qty"
                />
                <Button
                  type="primary"
                  loading={receiving}
                  disabled={!receiveSize || receiveQty < 1}
                  onClick={handleReceiveStock}
                  icon={<PlusCircleOutlined />}
                >
                  Receive
                </Button>
              </Space>
            </Card>

            {/* Quick Sale Inline */}
            <Card size="small" title={<><DollarOutlined /> Quick Sale</>}>
              <Space wrap style={{ width: "100%" }}>
                <Select
                  placeholder="Size"
                  value={billingSize}
                  onChange={setBillingSize}
                  style={{ width: 110 }}
                  options={result.stockLevels.map((s) => ({
                    label: `${s.sizeLabel} (${s.quantity})`,
                    value: s.sizeLabel,
                    disabled: s.quantity === 0,
                  }))}
                />
                <InputNumber
                  min={1}
                  max={9999}
                  value={billingQty}
                  onChange={(v) => setBillingQty(v ?? 1)}
                  style={{ width: 90 }}
                  placeholder="Qty"
                />
                <Button
                  type="primary"
                  loading={addingToBill}
                  disabled={!billingSize || billingQty < 1}
                  onClick={handleAddToBilling}
                  icon={<DollarOutlined />}
                >
                  Sell
                </Button>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ₹{result.product.basePrice.toLocaleString("en-IN")} each
                </Typography.Text>
              </Space>
            </Card>

            <Divider style={{ margin: "8px 0" }} />

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
                  icon={<ShoppingCartOutlined />}
                  onClick={() => router.push(`/dashboard/billing`)}
                >
                  Go to Billing
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/dashboard/stock`)}
                >
                  Stock Page
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
