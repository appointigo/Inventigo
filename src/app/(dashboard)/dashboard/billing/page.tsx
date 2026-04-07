"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Typography, Tabs, Input, Button, Table, Badge, Select, InputNumber, App, Flex, Tag } from "antd";
import { ShoppingCartOutlined, SearchOutlined, ScanOutlined, HistoryOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Product } from "@/modules/products/types";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useSales, useCart } from "@/modules/billing/hooks/useBilling";
import CartDrawer from "@/modules/billing/components/CartDrawer";
import SalesHistory from "@/modules/billing/components/SalesHistory";
import InvoicePreview from "@/modules/billing/components/InvoicePreview";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { Sale } from "@/modules/billing/types";

const { Title } = Typography;

const BillingPage = () => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("new-sale");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Product listing
  const { products, loading: productsLoading } = useProducts(
    search ? { search } : undefined
  );

  // Sales history
  const {
    sales,
    loading: salesLoading,
    filters: salesFilters,
    setFilters: setSalesFilters,
    createSale,
    refundSale,
    getSaleById,
  } = useSales();

  // Cart state
  const cart = useCart();

  // Size selection state per product (for manual dropdown selection)
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});


  // Auto-select size when search term exactly matches a variantSku
  useEffect(() => {
    if (!search) return;
    const searchLower = search.toLowerCase().trim();

    setSelectedSizes((prev) => {
      const next = { ...prev };
      for (const product of products) {
        const matched = product.stock.find(
          (s) => s.variantSku?.toLowerCase() === searchLower
        );
        if (matched) {
          next[product.id] = matched.sizeId;
        }
      }

      return next;
    });
  }, [search, products]);

  // Derive unique attribute keys from all loaded products (exclude internal fields)
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of products) {
      Object.keys(p.attributes).forEach((k) => {
        if (k !== "unit" && k !== "supplierId") keys.add(k);
      });
    }

    return [...keys];
  }, [products]);

  /** Get the matched stock entry when search exactly equals a variantSku */
  const getVariantMatch = useCallback(
    (product: Product) => {
      if (!search) return null;
      const searchLower = search.toLowerCase().trim();

      return product.stock.find((s) => s.variantSku?.toLowerCase() === searchLower) ?? null;
    }, 
    [search]
  );

  const handleAddToCart = useCallback(
    (product: Product) => {
      // Prefer auto-matched variantSku, then fall back to manually selected
      const matched = getVariantMatch(product);
      const sizeId = matched?.sizeId ?? selectedSizes[product.id];
      const sizeInfo = product.stock.find((s) => s.sizeId === sizeId);

      if (!sizeId || !sizeInfo) {
        message.warning("Please select a size first");
        return;
      }

      // Guard: out of stock
      if (sizeInfo.quantity <= 0) {
        message.error("This size is out of stock");
        return;
      }

      // Guard: don't exceed available stock vs what's already in cart
      const existing = cart.items.find(
        (i) => i.productId === product.id && i.sizeId === sizeId
      );
      if ((existing?.quantity ?? 0) + 1 > sizeInfo.quantity) {
        message.error(`Only ${sizeInfo.quantity} in stock for size ${sizeInfo.sizeLabel}`);
        return;
      }

      cart.addItem({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        sizeId,
        sizeLabel: sizeInfo.sizeLabel,
        quantity: 1,
        unitPrice: product.basePrice,
      });

      message.success(`${product.name} (${sizeInfo.sizeLabel}) added to cart`);
    },
    [getVariantMatch, selectedSizes, cart, message]
  );

  const handleConfirmSale = async () => {
    if (cart.items.length === 0) {
      message.warning("Cart is empty");
      return;
    }

    setSaleLoading(true);
    try {
      const sale = await createSale(cart.toCreateInput());
      setCompletedSale(sale);
      setInvoiceOpen(true);
      cart.clearCart();
      setCartOpen(false);
      message.success(`Sale created: ${sale.invoiceNumber}`);
    } 
    catch {
      message.error("Failed to create sale");
    } 
    finally {
      setSaleLoading(false);
    }
  };

  const productColumns: ColumnsType<Product> = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.name}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.sku} · {record.brandName} · {record.categoryName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Price",
      dataIndex: "basePrice",
      width: 100,
      align: "right",
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Stock",
      key: "stock",
      width: 80,
      align: "center",
      render: (_, record) => {
        const matched = getVariantMatch(record);
        const qty = matched ? matched.quantity : record.totalStock;
        return (
          <Badge
            color={qty === 0 ? "red" : qty <= 10 ? "orange" : "green"}
            text={qty}
          />
        );
      },
    },
    {
      title: "Size",
      key: "size",
      width: 130,
      render: (_, record) => {
        const matched = getVariantMatch(record);
        if (matched) {
          return (
            <Tag color="blue" style={{ margin: 0 }}>
              {matched.sizeLabel}
            </Tag>
          );
        }
        return (
          <Select
            placeholder="Size"
            size="small"
            value={selectedSizes[record.id]}
            onChange={(val) =>
              setSelectedSizes((prev) => ({ ...prev, [record.id]: val }))
            }
            style={{ width: 110 }}
            options={record.stock.map((s) => ({
              label: `${s.sizeLabel} (${s.quantity})`,
              value: s.sizeId,
              disabled: s.quantity === 0,
            }))}
          />
        );
      },
    },
    // Dynamic attribute columns derived from loaded products
    ...attributeKeys.map((key) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      key: `attr_${key}`,
      width: 100,
      render: (_: unknown, record: Product) => {
        const val = record.attributes[key];
        return val != null && val !== "" ? (
          <Typography.Text style={{ fontSize: 13 }}>{String(val)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>—</Typography.Text>
        );
      },
    })),
    {
      title: "Qty",
      key: "qty",
      width: 80,
      align: "center" as const,
      render: (_: unknown, record: Product) => {
        // Derive sizeId for this row (same logic as handleAddToCart)
        const matched = getVariantMatch(record);
        const sizeId = matched?.sizeId ?? selectedSizes[record.id];
        const stockEntry = record.stock.find((s) => s.sizeId === sizeId);
        const maxQty = stockEntry?.quantity ?? 999;

        // Read qty directly from cart so billing table and cart drawer are in sync
        const cartItem = cart.items.find(
          (i) => i.productId === record.id && i.sizeId === sizeId
        );
        const qtyInCart = cartItem?.quantity ?? 0;

        return (
          <InputNumber
            min={0}
            max={maxQty}
            value={qtyInCart}
            onChange={(val) => {
              if (!sizeId) return;
              const next = val ?? 0;
              if (next <= 0) {
                cart.removeItem(record.id, sizeId);
              } else {
                cart.updateQuantity(record.id, sizeId, next);
              }
            }}
            size="small"
            style={{ width: 64 }}
          />
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddToCart(record)}
          disabled={!record.isActive || record.totalStock === 0}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Billing</Title>
        <Badge count={cart.items.length}>
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => setCartOpen(true)}
            size="large"
          >
            Cart
          </Button>
        </Badge>
      </Flex>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "new-sale",
            label: (
              <span>
                <ScanOutlined /> New Sale
              </span>
            ),
            children: (
              <div>
                <Input
                  placeholder="Search products by name, SKU or variant barcode…"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  size="large"
                  style={{ marginBottom: 16 }}
                />
                <Table
                  columns={productColumns}
                  dataSource={products}
                  rowKey="id"
                  loading={productsLoading}
                  size="small"
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 600 }}
                />
              </div>
            ),
          },
          {
            key: "history",
            label: (
              <span>
                <HistoryOutlined /> Sales History
              </span>
            ),
            children: (
              <SalesHistory
                sales={sales}
                loading={salesLoading}
                filters={salesFilters}
                onFiltersChange={setSalesFilters}
                onRefund={refundSale}
                onViewSale={getSaleById}
              />
            ),
          },
        ]}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        items={cart.items}
        discountAmount={cart.discountAmount}
        taxAmount={cart.taxAmount}
        paymentMethod={cart.paymentMethod}
        customerName={cart.customerName}
        customerPhone={cart.customerPhone}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onDiscountChange={cart.setDiscountAmount}
        onTaxChange={cart.setTaxAmount}
        onPaymentMethodChange={cart.setPaymentMethod}
        onCustomerNameChange={cart.setCustomerName}
        onCustomerPhoneChange={cart.setCustomerPhone}
        onConfirmSale={handleConfirmSale}
        loading={saleLoading}
      />

      {/* Invoice Preview after sale */}
      <InvoicePreview
        sale={completedSale}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setCompletedSale(null);
        }}
      />
    </div>
  );
}

export default BillingPage;