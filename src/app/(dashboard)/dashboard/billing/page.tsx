"use client";

import { useState, useCallback, useMemo } from "react";
import { Tabs, Table, App } from "antd";
import { SearchOutlined, ScanOutlined, HistoryOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useSales, useCart } from "@/modules/billing/hooks/useBilling";
import { useAppSettings } from "@/modules/settings/hooks/useAppSettings";
import CartPanel from "@/modules/billing/components/CartPanel";
import SalesHistory from "@/modules/billing/components/SalesHistory";
import InvoicePreview from "@/modules/billing/components/InvoicePreview";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { Sale } from "@/modules/billing/types";
import {
  PageWrapper,
  PageHeader,
  SplitLayout,
  ProductPane,
  CartPane,
  SearchContainer,
  SearchInput,
  ProductNameText,
  ProductMetaText,
  StockBadgeWrap,
  AttrText,
  EmptyAttrText,
  VariantSkuText,
  VariantSkuEmpty,
  QtyInput,
  AddButton,
  TableWrapper,
  PageTitle,
  SizeTag,
} from "./billing.styled";

const BillingPage = () => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("new-sale");
  const [search, setSearch] = useState("");
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
  const { settings } = useAppSettings();
  const defaultTaxPct = settings?.billingConfig?.taxRate ?? 0;

  // ─── Variant rows ────────────────────────────────────────────────────────────
  // Flatten products → one row per size/variant so each barcode maps to one row.

  type VariantRow = {
    rowKey: string;
    productId: string;
    productName: string;
    sku: string;
    variantSku: string | null;
    brandName: string;
    categoryName: string;
    basePrice: number;
    isActive: boolean;
    attributes: Record<string, unknown>;
    sizeId: string;
    sizeLabel: string;
    stockQty: number;
  };

  const variantRows = useMemo((): VariantRow[] => {
    const rows: VariantRow[] = products.flatMap((p) =>
      p.stock.map((s) => ({
        rowKey: `${p.id}-${s.sizeId}`,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        variantSku: s.variantSku ?? null,
        brandName: p.brandName,
        categoryName: p.categoryName,
        basePrice: p.basePrice,
        isActive: p.isActive,
        attributes: p.attributes,
        sizeId: s.sizeId,
        sizeLabel: s.sizeLabel,
        stockQty: s.quantity,
      }))
    );

    if (search) {
      const s = search.toLowerCase().trim();
      // Exact variantSku match (barcode scan) → show only that single row
      const exact = rows.find((r) => r.variantSku?.toLowerCase() === s);
      if (exact) return [exact];
      // Otherwise: show all rows whose variantSku or name/sku contains the search
      return rows.filter(
        (r) =>
          r.variantSku?.toLowerCase().includes(s) ||
          r.productName.toLowerCase().includes(s) ||
          r.sku.toLowerCase().includes(s)
      );
    }

    return rows;
  }, [products, search]);

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

  const handleAddToCart = useCallback(
    (row: VariantRow) => {
      if (row.stockQty <= 0) {
        message.error("This variant is out of stock");
        return;
      }

      const existing = cart.items.find(
        (i) => i.productId === row.productId && i.sizeId === row.sizeId
      );
      if ((existing?.quantity ?? 0) + 1 > row.stockQty) {
        message.error(`Only ${row.stockQty} in stock for size ${row.sizeLabel}`);
        return;
      }

      cart.addItem({
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        sizeId: row.sizeId,
        sizeLabel: row.sizeLabel,
        attributes: row.attributes as Record<string, unknown>,
        quantity: 1,
        unitPrice: row.basePrice,
      });

      message.success(`${row.productName} (${row.sizeLabel}) added to cart`);
    },
    [cart, message]
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
      message.success(`Sale created: ${sale.invoiceNumber}`);
    } 
    catch {
      message.error("Failed to create sale");
    } 
    finally {
      setSaleLoading(false);
    }
  };

  const variantColumns: ColumnsType<VariantRow> = [
    {
      title: "Product",
      key: "product",
      render: (_, row) => (
        <div>
          <ProductNameText>{row.productName}</ProductNameText>
          <ProductMetaText>
            {row.brandName} · {row.categoryName}
          </ProductMetaText>
        </div>
      ),
    },
    {
      title: "Variant SKU",
      key: "variantSku",
      width: 160,
      render: (_, row) =>
        row.variantSku ? (
          <VariantSkuText>{row.variantSku}</VariantSkuText>
        ) : (
          <VariantSkuEmpty>—</VariantSkuEmpty>
        ),
    },
    {
      title: "Size",
      key: "size",
      width: 80,
      render: (_, row) => <SizeTag color="blue">{row.sizeLabel}</SizeTag>,
    },
    {
      title: "Price",
      key: "price",
      width: 100,
      align: "right",
      render: (_, row) => formatCurrency(row.basePrice),
    },
    {
      title: "Stock",
      key: "stock",
      width: 72,
      align: "center",
      render: (_, row) => {
        const level = row.stockQty === 0 ? "low" : row.stockQty <= 10 ? "mid" : "high";
        return <StockBadgeWrap $level={level}>{row.stockQty}</StockBadgeWrap>;
      },
    },
    // Dynamic attribute columns
    ...attributeKeys.map((key) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      key: `attr_${key}`,
      width: 90,
      render: (_: unknown, row: VariantRow) => {
        const val = row.attributes[key];
        return val != null && val !== "" ? (
          <AttrText>{String(val)}</AttrText>
        ) : (
          <EmptyAttrText>—</EmptyAttrText>
        );
      },
    })),
    {
      title: "Qty",
      key: "qty",
      width: 80,
      align: "center" as const,
      render: (_: unknown, row: VariantRow) => {
        const cartItem = cart.items.find(
          (i) => i.productId === row.productId && i.sizeId === row.sizeId
        );
        const qtyInCart = cartItem?.quantity ?? 0;
        return (
          <QtyInput
            min={0}
            max={row.stockQty}
            $active={qtyInCart > 0}
            value={qtyInCart}
            onChange={(val) => {
              const next = (val as number) ?? 0;
              if (next <= 0) {
                cart.removeItem(row.productId, row.sizeId);
              } else {
                cart.updateQuantity(row.productId, row.sizeId, next);
              }
            }}
            size="small"
          />
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 56,
      render: (_, row) => (
        <AddButton
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddToCart(row)}
          disabled={!row.isActive || row.stockQty === 0}
        />
      ),
    },
  ];

  return (
    <PageWrapper>
      <SplitLayout>
        {/* Left: product search + table */}
        <ProductPane>
          <PageHeader>
            <PageTitle>Billing</PageTitle>
          </PageHeader>

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
                    <SearchContainer>
                      <SearchInput
                        placeholder="Search products by name, SKU or variant barcode…"
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                        size="large"
                      />
                    </SearchContainer>
                    <TableWrapper>
                      <Table
                        columns={variantColumns}
                        dataSource={variantRows}
                        rowKey="rowKey"
                        loading={productsLoading}
                        size="small"
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 700 }}
                      />
                    </TableWrapper>
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
        </ProductPane>

        {/* Right: always-visible cart panel */}
        {activeTab === "new-sale" && (
          <CartPane>
            <CartPanel
              items={cart.items}
              subtotal={cart.subtotal}
              discountPct={cart.discountPct}
              taxPct={cart.taxPct}
              defaultTaxPct={defaultTaxPct}
              paymentMethod={cart.paymentMethod}
              customerName={cart.customerName}
              customerPhone={cart.customerPhone}
              onUpdateQuantity={cart.updateQuantity}
              onRemoveItem={cart.removeItem}
              onDiscountPctChange={cart.setDiscountPct}
              onTaxPctChange={cart.setTaxPct}
              onPaymentMethodChange={cart.setPaymentMethod}
              onCustomerNameChange={cart.setCustomerName}
              onCustomerPhoneChange={cart.setCustomerPhone}
              onConfirmSale={handleConfirmSale}
              loading={saleLoading}
            />
          </CartPane>
        )}
      </SplitLayout>

      {/* Invoice preview modal after sale */}
      <InvoicePreview
        sale={completedSale}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setCompletedSale(null);
        }}
      />
    </PageWrapper>
  );
}

export default BillingPage;