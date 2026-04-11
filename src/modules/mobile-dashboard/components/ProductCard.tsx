"use client";

import { Button, Tag, Typography } from "antd";
import type { Product } from "@/modules/products/types";
import { Card } from "./Card";

function resolveStockMeta(totalStock: number) {
  if (totalStock <= 0) return { label: "Out", color: "red" as const };
  if (totalStock <= 5) return { label: "Low", color: "orange" as const };
  return { label: "In Stock", color: "green" as const };
}

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd?: (product: Product) => void;
}) {
  const stockMeta = resolveStockMeta(product.totalStock);

  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>{product.name}</Typography.Text>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
            {product.categoryName} • {product.brandName}
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Typography.Text strong style={{ fontSize: 16 }}>Rs {product.basePrice.toFixed(2)}</Typography.Text>
            <Tag color={stockMeta.color} style={{ marginInlineEnd: 0 }}>{stockMeta.label}</Tag>
            <Typography.Text type="secondary">{product.totalStock} pcs</Typography.Text>
          </div>
        </div>
        {onAdd ? <Button type="primary" onClick={() => onAdd(product)}>Add</Button> : null}
      </div>
    </Card>
  );
}
