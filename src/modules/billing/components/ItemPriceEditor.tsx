"use client";

import { InputNumber, Select, Typography } from "antd";
import type { CartItem } from "../types";
import type { ItemPriceAdjustment, ItemDiscountType } from "../utils/pricingEngine";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { ItemPricingControls } from "./CartPanel.styled";

export type UpdateItemPricing = (productId: string, sizeId: string, adjustment: ItemPriceAdjustment) => void;

export function ItemPriceEditor({ item, onChange }: { item: CartItem; onChange: UpdateItemPricing }) {
  const original = item.originalUnitPrice ?? item.unitPrice;
  const mode = item.itemDiscountType ?? "NONE";
  const maximum = mode === "PERCENTAGE" ? 100 : mode === "FLAT" ? original : 99999999.99;
  const update = (itemDiscountType: ItemDiscountType, itemDiscountValue: number) =>
    onChange(item.productId, item.sizeId, { itemDiscountType, itemDiscountValue });
  return (
    <ItemPricingControls>
      <Typography.Text type="secondary">Original {formatCurrency(original)}</Typography.Text>
      <Select<ItemDiscountType>
        aria-label={`Pricing for ${item.productName} ${item.sizeLabel}`}
        value={mode}
        options={[
          { value: "NONE", label: "Normal price" },
          { value: "PRICE", label: "Selling price / unit" },
          { value: "FLAT", label: "₹ off / unit" },
          { value: "PERCENTAGE", label: "% off / unit" },
        ]}
        onChange={(type) => update(type, type === "PRICE" ? item.unitPrice : 0)}
      />
      {mode !== "NONE" && <InputNumber<number>
        aria-label={`Item ${mode === "PRICE" ? "selling price" : "discount"} for ${item.productName}`}
        min={0} max={maximum} precision={2}
        value={item.itemDiscountValue ?? 0}
        onChange={(value) => {
          if (value == null) { update(mode, 0); return; }
          if (Number.isFinite(value)) update(mode, Math.min(maximum, Math.max(0, value)));
        }}
      />}
      <Typography.Text>Final {formatCurrency(item.unitPrice)} / unit</Typography.Text>
    </ItemPricingControls>
  );
}
