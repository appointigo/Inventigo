export type ExchangeLineInput = { productId: string; sizeId: string; quantity: number; total: number };

export function attachReplacementCostSnapshots<T extends ExchangeLineInput>(
  items: T[],
  products: Array<{ id: string; costPrice: unknown }>,
) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw new Error("Invalid exchange product");
    const costPrice = Number(product.costPrice);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      throw new Error("Exchange product cost is invalid");
    }
    return { ...item, costPrice };
  });
}
