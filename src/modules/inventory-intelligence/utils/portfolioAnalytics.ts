const round = (value: number) => Number(value.toFixed(2));

export type InventoryPosition = {
  dimensionId: string;
  dimensionLabel: string;
  quantity: number;
  unitCost: number;
};

export function buildInventoryValuation(positions: InventoryPosition[]) {
  const grouped = new Map<string, { id: string; label: string; inventoryValue: number; units: number }>();
  positions.forEach((position) => {
    const row = grouped.get(position.dimensionId) ?? {
      id: position.dimensionId,
      label: position.dimensionLabel,
      inventoryValue: 0,
      units: 0,
    };
    row.units += Math.max(0, position.quantity);
    row.inventoryValue += Math.max(0, position.quantity) * position.unitCost;
    grouped.set(position.dimensionId, row);
  });
  return Array.from(grouped.values())
    .map((row) => ({ ...row, inventoryValue: round(row.inventoryValue) }))
    .sort((a, b) => b.inventoryValue - a.inventoryValue);
}

export function buildCategorySizeDemand(rows: Array<{
  categoryId: string;
  category: string;
  sizeId: string;
  size: string;
  units: number;
}>) {
  const grouped = new Map<string, {
    categoryId: string;
    category: string;
    sizeId: string;
    size: string;
    netUnitsSold: number;
  }>();
  rows.forEach((row) => {
    const key = `${row.categoryId}:${row.sizeId}`;
    const value = grouped.get(key) ?? { ...row, netUnitsSold: 0 };
    value.netUnitsSold += row.units;
    grouped.set(key, value);
  });
  return Array.from(grouped.values()).sort(
    (a, b) => a.category.localeCompare(b.category) || a.size.localeCompare(b.size),
  );
}
