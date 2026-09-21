import type { Key } from "react";

export interface BarcodeSelection<T extends { id: string }> {
  ids: string[];
  productsById: Record<string, T>;
}

export function updateBarcodeSelection<T extends { id: string }>(
  previous: BarcodeSelection<T>,
  visibleProducts: T[],
  selectedVisibleKeys: Key[],
): BarcodeSelection<T> {
  const selectedVisibleIds = new Set(selectedVisibleKeys.map(String));
  const visibleIds = new Set(visibleProducts.map((product) => product.id));
  const hiddenIds = previous.ids.filter((id) => !visibleIds.has(id));
  const visibleSelected = visibleProducts.filter((product) => selectedVisibleIds.has(product.id));
  const ids = [...new Set([...hiddenIds, ...visibleSelected.map((product) => product.id)])];
  const productsById = { ...previous.productsById };

  for (const product of visibleProducts) {
    if (selectedVisibleIds.has(product.id)) productsById[product.id] = product;
    else delete productsById[product.id];
  }

  for (const id of Object.keys(productsById)) {
    if (!ids.includes(id)) delete productsById[id];
  }

  return { ids, productsById };
}
