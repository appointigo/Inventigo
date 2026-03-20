export type BarcodeLookupResult = {
  product: {
    id: string;
    name: string;
    sku: string;
    categoryName: string;
    brandName: string;
    basePrice: number;
    imageUrl: string | null;
  };
  stockLevels: {
    sizeLabel: string;
    quantity: number;
    status: "OK" | "LOW" | "OUT";
  }[];
};
