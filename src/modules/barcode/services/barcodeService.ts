import type { BarcodeLookupResult } from "../types";

const API_BASE = "/api/barcode";

export const barcodeService = {
  async lookup(sku: string): Promise<BarcodeLookupResult | null> {
    const res = await fetch(`${API_BASE}/lookup?sku=${encodeURIComponent(sku)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Barcode lookup failed");
    return res.json();
  },
};
