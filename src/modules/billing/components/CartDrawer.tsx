"use client";

import { Drawer, Table, InputNumber, Button, Typography, Divider, Input, Select, Space, Empty, Flex } from "antd";
import { DeleteOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { CartItem, PaymentMethodType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const { Text, Title } = Typography;

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  discountAmount: number;
  taxAmount: number;
  paymentMethod: PaymentMethodType;
  customerName: string;
  customerPhone: string;
  onClose: () => void;
  onUpdateQuantity: (productId: string, sizeId: string, quantity: number) => void;
  onRemoveItem: (productId: string, sizeId: string) => void;
  onDiscountChange: (amount: number) => void;
  onTaxChange: (amount: number) => void;
  onPaymentMethodChange: (method: PaymentMethodType) => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onConfirmSale: () => void;
  loading: boolean;
}

export default function CartDrawer({
  open,
  items,
  discountAmount,
  taxAmount,
  paymentMethod,
  customerName,
  customerPhone,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onDiscountChange,
  onTaxChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onConfirmSale,
  loading,
}: CartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal - discountAmount + taxAmount;

  const columns: ColumnsType<CartItem> = [
    {
      title: "Item",
      key: "item",
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{record.productName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.sku} · Size: {record.sizeLabel}
          </Text>
        </div>
      ),
    },
    {
      title: "Price",
      dataIndex: "unitPrice",
      width: 90,
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Qty",
      width: 80,
      render: (_, record) => (
        <InputNumber
          min={1}
          max={99}
          value={record.quantity}
          size="small"
          onChange={(val) => onUpdateQuantity(record.productId, record.sizeId, val ?? 1)}
        />
      ),
    },
    {
      title: "Total",
      width: 90,
      render: (_, record) => formatCurrency(record.unitPrice * record.quantity),
    },
    {
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => onRemoveItem(record.productId, record.sizeId)}
        />
      ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <ShoppingCartOutlined />
          Cart ({items.length} items)
        </Space>
      }
      open={open}
      onClose={onClose}
      size={520}
      footer={
        <div style={{ padding: "8px 0" }}>
          <Button
            type="primary"
            block
            size="large"
            onClick={onConfirmSale}
            loading={loading}
            disabled={items.length === 0}
          >
            Confirm Sale — {formatCurrency(total)}
          </Button>
        </div>
      }
    >
      {items.length === 0 ? (
        <Empty description="No items in cart" />
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={items}
            rowKey={(r) => `${r.productId}-${r.sizeId}`}
            pagination={false}
            size="small"
          />

          <Divider />

          {/* Customer Info */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>Customer (optional)</Text>
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                size="small"
              />
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => onCustomerPhoneChange(e.target.value)}
                size="small"
              />
            </Space>
          </div>

          <Divider />

          {/* Payment & Totals */}
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>Payment Method</Text>
            <Select
              value={paymentMethod}
              onChange={onPaymentMethodChange}
              style={{ width: "100%" }}
              size="small"
              options={[
                { label: "Cash", value: "CASH" },
                { label: "Card", value: "CARD" },
                { label: "UPI", value: "UPI" },
              ]}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Text>Discount</Text>
              <InputNumber
                min={0}
                max={subtotal}
                value={discountAmount}
                onChange={(val) => onDiscountChange(val ?? 0)}
                size="small"
                prefix="₹"
                style={{ width: 120 }}
              />
            </Space>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Text>Tax</Text>
              <InputNumber
                min={0}
                value={taxAmount}
                onChange={(val) => onTaxChange(val ?? 0)}
                size="small"
                prefix="₹"
                style={{ width: 120 }}
              />
            </Space>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          <Flex justify="space-between" style={{ marginBottom: 4 }}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(subtotal)}</Text>
          </Flex>
          {discountAmount > 0 && (
            <Flex justify="space-between" style={{ marginBottom: 4 }}>
              <Text type="success">Discount</Text>
              <Text type="success">-{formatCurrency(discountAmount)}</Text>
            </Flex>
          )}
          {taxAmount > 0 && (
            <Flex justify="space-between" style={{ marginBottom: 4 }}>
              <Text>Tax</Text>
              <Text>{formatCurrency(taxAmount)}</Text>
            </Flex>
          )}
          <Flex justify="space-between" style={{ marginTop: 8 }}>
            <Title level={4} style={{ margin: 0 }}>Total</Title>
            <Title level={4} style={{ margin: 0 }}>{formatCurrency(total)}</Title>
          </Flex>
        </>
      )}
    </Drawer>
  );
}
