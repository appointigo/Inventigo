export type BarcodeLookupResult = {
  product: {
    id: string;
    name: string;
    sku: string;
    externalBarcode: string | null;
    categoryName: string;
    brandName: string;
    basePrice: number;
    imageUrl: string | null;
  };
  stockLevels: {
    sizeLabel: string;
    variantSku: string | null;
    quantity: number;
    status: "OK" | "LOW" | "OUT";
  }[];
  /** When the scanned barcode matched a variant SKU, this contains the size label */
  matchedVariant: string | null;
};
