"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Table, Button, Space, Tag, Input, InputNumber, Select, Popconfirm, Tooltip, Badge, Flex, Empty, Modal, Card, Switch } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, UploadOutlined, CopyOutlined, PrinterOutlined, CloseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import BarcodeGenerator from "@/modules/barcode/components/BarcodeGenerator";
import type { Product } from "../types";
import type { Category } from "@/modules/categories/types";
import type { Brand } from "@/modules/brands/types";
import { buildVariantSku } from "@/shared/services/barcodeService";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string | undefined;
  onCategoryChange: (value: string | undefined) => void;
  brandFilter: string | undefined;
  onBrandChange: (value: string | undefined) => void;
  onAdd: () => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  duplicateLoadingId?: string | null;
  onDelete: (id: string) => Promise<void>;
  onBulkUpload?: () => void;
  attributeSchema: Category["attributeSchema"] | null;
  attributeFilters: Record<string, string | string[]>;
  onAttributeChange: (name: string, value: string | string[] | undefined) => void;
  onClearAttributeFilters: () => void;
  onClearAllFilters: () => void;
  currentCategory?: Category | undefined;
}

const ProductTable = ({
  products,
  categories,
  brands,
  loading,
  total,
  page,
  pageSize,
  onPaginationChange,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  brandFilter,
  onBrandChange,
  onAdd,
  onView,
  onEdit,
  onDuplicate,
  duplicateLoadingId,
  onDelete,
  onBulkUpload,
  attributeSchema,
  attributeFilters,
  onAttributeChange,
  onClearAttributeFilters,
  onClearAllFilters,
  currentCategory,
}: ProductTableProps) => {
  const [barcodePrintOpen, setBarcodePrintOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>({});
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(event.target as Node)) {
        setMoreFiltersOpen(false);
      }
    };

    if (moreFiltersOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreFiltersOpen]);

  const sizeOptions = currentCategory?.sizes?.map((size) => ({ label: size.label, value: size.id })) ?? [];
  const visibleAttributeFields = useMemo(() => attributeSchema?.fields?.slice(0, 3) ?? [], [attributeSchema]);
  const hiddenAttributeFields = useMemo(() => attributeSchema?.fields?.slice(3) ?? [], [attributeSchema]);

  const sizeFilterValue = attributeFilters.sizeId;
  const sizeFilterLabel = typeof sizeFilterValue === "string"
    ? currentCategory?.sizes?.find((size) => size.id === sizeFilterValue)?.label ?? sizeFilterValue
    : Array.isArray(sizeFilterValue)
    ? sizeFilterValue
        .map((value) => currentCategory?.sizes?.find((size) => size.id === value)?.label ?? value)
        .join(", ")
    : undefined;

  const activeAttributeFilters = useMemo(() => {
    const active: Array<{ key: string; label: string; value: string | string[] }> = [];

    if (sizeFilterValue !== undefined && sizeFilterValue !== null && sizeFilterValue !== "" && (!Array.isArray(sizeFilterValue) || sizeFilterValue.length > 0)) {
      active.push({ key: "sizeId", label: "Size", value: sizeFilterLabel ?? String(sizeFilterValue) });
    }

    if (attributeSchema?.fields) {
      attributeSchema.fields.forEach((field) => {
        if (field.name === "sizeId") return;
        const value = attributeFilters[field.name];
        if (value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0)) {
          active.push({ key: field.name, label: field.name, value });
        }
      });
    }
    return active;
  }, [attributeSchema, attributeFilters, sizeFilterLabel, sizeFilterValue]);

  const hasActiveAttributeFilters = activeAttributeFilters.length > 0;
  const hiddenActiveCount = useMemo(
    () =>
      hiddenAttributeFields.filter((field) => {
        const value = attributeFilters[field.name];
        return value !== undefined && value !== null && value !== "";
      }).length,
    [hiddenAttributeFields, attributeFilters]
  );

  useEffect(() => {
    const pageIds = new Set(products.map((product) => product.id));
    setSelectedProductIds((prev) => prev.filter((id) => pageIds.has(id)));
  }, [products]);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds]
  );

  const barcodeRows = useMemo(
    () =>
      selectedProducts.flatMap((product) =>
        product.stock.map((size) => ({
          key: `${product.id}-${size.sizeId}`,
          productName: product.name,
          sku: product.sku,
          sizeLabel: size.sizeLabel,
          quantity: size.quantity,
          barcodeValue: buildVariantSku(product.sku, size.sizeLabel),
        }))
      ),
    [selectedProducts]
  );

  const totalLabels = barcodeRows.reduce((sum, row) => sum + (copiesMap[row.key] ?? row.quantity), 0);

  const handleOpenBarcodePrint = () => {
    setCopiesMap(
      barcodeRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.key] = Math.max(0, row.quantity);
        return acc;
      }, {})
    );
    setBarcodePrintOpen(true);
  };

  const setCopies = (rowKey: string, value: number | null) => {
    setCopiesMap((prev) => ({
      ...prev,
      [rowKey]: Math.max(0, Math.min(500, value ?? 0)),
    }));
  };

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const handlePrintLabels = () => {
    const labels = barcodeRows.flatMap((row) =>
      Array.from({ length: copiesMap[row.key] ?? row.quantity }, () => row)
    );

    if (labels.length === 0) {
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Barcode Labels</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              display: flex;
              flex-wrap: wrap;
              gap: 4mm;
            }
            .label {
              width: 62mm;
              height: 34mm;
              border: 0.5px dashed #ccc;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
            }
            .name {
              font-size: 8pt;
              font-weight: 700;
              width: 100%;
              text-align: center;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .meta {
              font-size: 7pt;
              color: #666;
              margin-bottom: 1mm;
            }
            .size {
              font-size: 8pt;
              font-weight: 700;
              background: #111;
              color: #fff;
              border-radius: 3px;
              padding: 0 4px;
              margin-bottom: 1mm;
            }
            .barcode {
              max-width: 55mm;
              height: 14mm;
            }
            @media print {
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          ${labels
            .map(
              (row) => `
                <div class="label" data-barcode="${row.barcodeValue}">
                  <div class="name">${escapeHtml(row.productName)}</div>
                  <div class="meta">SKU: ${escapeHtml(row.sku)}</div>
                  <div class="size">Size: ${escapeHtml(row.sizeLabel)}</div>
                  <svg class="barcode"></svg>
                </div>
              `
            )
            .join("")}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <script>
            window.onload = function () {
              document.querySelectorAll('.label').forEach(function (label) {
                var barcodeValue = label.getAttribute('data-barcode');
                var svg = label.querySelector('.barcode');
                JsBarcode(svg, barcodeValue, {
                  format: 'EAN13',
                  width: 2,
                  height: 40,
                  displayValue: true,
                  fontSize: 8,
                  margin: 2,
                });
              });
              setTimeout(function () { window.print(); }, 400);
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
    setBarcodePrintOpen(false);
  };

  const barcodeColumns: ColumnsType<(typeof barcodeRows)[number]> = [
    {
      title: "Product",
      dataIndex: "productName",
      width: 220,
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{record.sku}</div>
        </div>
      ),
    },
    {
      title: "Size",
      dataIndex: "sizeLabel",
      width: 110,
      render: (sizeLabel: string) => <Tag color="blue">{sizeLabel}</Tag>,
    },
    {
      title: "Barcode",
      dataIndex: "barcodeValue",
      render: (barcodeValue: string) => (
        <div>
          <div style={{ lineHeight: 0 }}>
            <BarcodeGenerator value={barcodeValue} format="ean13" height={34} width={150} fontSize={9} />
          </div>
          <div style={{ fontSize: 11, color: "#888" }}>{barcodeValue}</div>
        </div>
      ),
    },
    {
      title: "Labels",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={500}
          value={copiesMap[record.key] ?? record.quantity}
          onChange={(value) => setCopies(record.key, value)}
          style={{ width: 90 }}
        />
      ),
    },
  ];

  const hasActiveFilters = Boolean(
    search ||
    categoryFilter ||
    brandFilter ||
    Object.keys(attributeFilters).length > 0
  );

  const columns: ColumnsType<Product> = [
    {
      title: "Product",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{record.sku}</div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      responsive: ["md"],
      render: (name: string) => <Tag>{name}</Tag>,
    },
    {
      title: "Brand",
      dataIndex: "brandName",
      responsive: ["md"],
    },
    {
      title: "Price",
      dataIndex: "basePrice",
      width: 120,
      align: "right",
      sorter: (a, b) => a.basePrice - b.basePrice,
      render: (price: number) => `₹${price.toLocaleString("en-IN")}`,
    },
    {
      title: "Stock",
      dataIndex: "totalStock",
      width: 100,
      align: "center",
      sorter: (a, b) => a.totalStock - b.totalStock,
      render: (total: number) => {
        const color = total === 0 ? "red" : total <= 10 ? "orange" : "green";
        return <Badge color={color} text={total} />;
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="View" destroyOnHidden>
            <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit" destroyOnHidden>
            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Tooltip title="Duplicate" destroyOnHidden>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => onDuplicate(record)}
              loading={duplicateLoadingId === record.id}
              disabled={!!duplicateLoadingId && duplicateLoadingId !== record.id}
            />
          </Tooltip>
          <Popconfirm
            title="Delete product"
            description="Are you sure you want to delete this product?"
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete" destroyOnHidden>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Flex
        justify="space-between"
        align="center"
        gap={12}
        wrap
        style={{ marginBottom: 16 }}
      >
        <Space wrap>
          <Input
            placeholder="Search products..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={onCategoryChange}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
          <Select
            placeholder="All Brands"
            value={brandFilter}
            onChange={onBrandChange}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 140 }}
            options={brands.map((b) => ({ label: b.name, value: b.id }))}
          />
          {categoryFilter && sizeOptions.length > 0 && (
          <Select
            placeholder="All Sizes"
            value={attributeFilters.sizeId ?? undefined}
            onChange={(value) => onAttributeChange("sizeId", value as string | undefined)}
            optionFilterProp="label"
            showSearch
            allowClear
            style={{ width: 140 }}
            options={sizeOptions}
          />
        )}
        </Space>
        <Space>
          <Button
            icon={<PrinterOutlined />}
            disabled={selectedProductIds.length === 0 || barcodeRows.length === 0}
            onClick={handleOpenBarcodePrint}
          >
            Print Barcodes ({selectedProductIds.length})
          </Button>
          {onBulkUpload && (
            <Button icon={<UploadOutlined />} onClick={onBulkUpload}>
              Bulk Upload
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            Add Product
          </Button>
        </Space>
      </Flex>
      <Flex gap={8} wrap style={{ marginBottom: 16 }}>
        
        {categoryFilter && visibleAttributeFields.length > 0 && (
          <Flex gap={8} style={{ flexShrink: 0 }}>
            {visibleAttributeFields.map((field) => {
              const rawValue = attributeFilters[field.name];
              const selectOptions = (field.options ?? []).map((option) => ({ label: option, value: option }));

              return (
                <div key={field.name} style={{ minWidth: 120, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>{field.name}</div>
                  {field.type === "select" ? (
                    <Select
                      allowClear
                      size="small"
                      placeholder="All"
                      value={Array.isArray(rawValue) ? String(rawValue[rawValue.length - 1]) : (rawValue ?? undefined)}
                      onChange={(value) => onAttributeChange(field.name, value as string | undefined)}
                      options={selectOptions}
                      style={{ width: "100%" }}
                    />
                  ) : field.type === "number" ? (
                    <InputNumber
                      size="small"
                      placeholder="All"
                      value={rawValue !== undefined && rawValue !== null ? Number(rawValue) : undefined}
                      onChange={(value) => onAttributeChange(field.name, value === null ? undefined : String(value))}
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <Input
                      size="small"
                      placeholder="All"
                      value={Array.isArray(rawValue) ? String(rawValue[rawValue.length - 1]) : (rawValue as string ?? "")}
                      onChange={(e) => onAttributeChange(field.name, e.target.value || undefined)}
                    />
                  )}
                </div>
              );
            })}
          </Flex>
        )}
        {categoryFilter && hiddenAttributeFields.length > 0 && (
          <div style={{ position: "relative", flexShrink: 0,display:"flex",flexDirection:"column-reverse" }} ref={moreFiltersRef}>
            <Button onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}>
              + More filters
              {hiddenActiveCount > 0 && (
                <Badge count={hiddenActiveCount} style={{ backgroundColor: "#1677ff", marginLeft: 8 }} />
              )}
            </Button>
            {moreFiltersOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 8,
                  background: "#fff",
                  border: "0.5px solid #f0f0f0",
                  borderRadius: 10,
                  padding: 14,
                  zIndex: 1000,
                  minWidth: 400,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  {hiddenAttributeFields.map((field) => {
                    const rawValue = attributeFilters[field.name];
                    const selectOptions = (field.options ?? []).map((option) => ({ label: option, value: option }));

                    return (
                      <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>{field.name}</div>
                        {field.type === "select" ? (
                          <Select
                            allowClear
                            size="small"
                            placeholder="All"
                            value={Array.isArray(rawValue) ? String(rawValue[rawValue.length - 1]) : (rawValue ?? undefined)}
                            onChange={(value) => onAttributeChange(field.name, value as string | undefined)}
                            options={selectOptions}
                          />
                        ) : field.type === "multi-select" || field.type === "multiselect" ? (
                          <Select
                            mode="multiple"
                            allowClear
                            size="small"
                            placeholder="All"
                            value={Array.isArray(rawValue) ? rawValue : String(rawValue || "").split(",").map((item) => item.trim()).filter(Boolean)}
                            onChange={(value) => onAttributeChange(field.name, value as string[])}
                            options={selectOptions}
                          />
                        ) : field.type === "number" ? (
                          <InputNumber
                            size="small"
                            placeholder="All"
                            value={rawValue !== undefined && rawValue !== null ? Number(rawValue) : undefined}
                            onChange={(value) => onAttributeChange(field.name, value === null ? undefined : String(value))}
                          />
                        ) : field.type === "boolean" ? (
                          <Switch
                            checked={rawValue === true || rawValue === "true"}
                            onChange={(checked) => onAttributeChange(field.name, String(checked))}
                          />
                        ) : (
                          <Input
                            size="small"
                            placeholder="All"
                            value={Array.isArray(rawValue) ? String(rawValue[rawValue.length - 1]) : (rawValue as string ?? "")}
                            onChange={(e) => onAttributeChange(field.name, e.target.value || undefined)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Flex>
      
      {hasActiveAttributeFilters && (
        <Flex gap={8} wrap style={{ marginBottom: 16, alignItems: "center" }}>
          <Flex gap={8} wrap style={{ flex: 1 }}>
            {activeAttributeFilters.map(({ key, label, value }) => (
              <Tag
                key={key}
                closable
                onClose={() => onAttributeChange(key, undefined)}
                style={{ marginRight: 0 }}
              >
                {label}: {Array.isArray(value) ? value.join(", ") : String(value)}
              </Tag>
            ))}
          </Flex>
          <Button type="link" danger style={{ fontSize: 12, padding: 0 }} onClick={onClearAllFilters}>
            Clear filters
          </Button>
        </Flex>
      )}
      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedProductIds,
          onChange: (selectedRowKeys) => setSelectedProductIds(selectedRowKeys.map(String)),
        }}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: onPaginationChange,
          showTotal: (t) => `${t} products`,
        }}
        locale={{
          emptyText: !loading && products.length === 0 ? (
            hasActiveFilters ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: "#888" }}>
                    No products found for these filters.
                  </span>
                }
              >
                <Button type="primary" onClick={onClearAllFilters}>
                  Clear all filters
                </Button>
              </Empty>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: "#888" }}>
                    {categories.length === 0
                      ? "Add a category first, then come back to add products."
                      : "No products yet. Start building your inventory."
                    }
                  </span>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={categories.length === 0}>
                  {categories.length === 0 ? "Add a category first" : "Add your first product"}
                </Button>
              </Empty>
            )
          ) : undefined,
        }}
      />

      <Modal
        title={`Print Barcode Labels (${selectedProductIds.length} products)`}
        open={barcodePrintOpen}
        onCancel={() => setBarcodePrintOpen(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setBarcodePrintOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrintLabels}
            disabled={totalLabels <= 0}
          >
            Print {totalLabels} label{totalLabels === 1 ? "" : "s"}
          </Button>,
        ]}
      >
        <Table
          columns={barcodeColumns}
          dataSource={barcodeRows}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ y: 420 }}
        />
      </Modal>
    </>
  );
}

export default ProductTable;
