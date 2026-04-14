import { createHash } from "crypto";

/**
 * Barcode Generation & Validation Service
 * Handles EAN-13/UPC-A compliant barcode generation and validation
 */

// ─── EAN-13 Checksum Validation ────────────────────────────────────────────────

/**
 * Computes EAN-13 check digit for a 12-digit payload
 * Uses weighted sum: odd positions × 1, even positions × 3
 */
export const computeEan13CheckDigit = (digits12: string): string => {
  if (!/^\d{12}$/.test(digits12)) {
    throw new Error(`Invalid EAN-13 payload: expected 12 digits, got "${digits12}"`);
  }

  const digits = digits12.split("").map((d) => Number(d));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return String(check);
};

/**
 * Validates a complete EAN-13 barcode (13 digits with correct check digit)
 */
export const validateEan13 = (barcode: string): boolean => {
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }

  const payload = barcode.slice(0, 12);
  const checkDigit = barcode.slice(12);
  const expectedCheck = computeEan13CheckDigit(payload);

  return checkDigit === expectedCheck;
};

// ─── Variant SKU (EAN-13) Generation ──────────────────────────────────────────

/**
 * Normalizes a size label for consistent key generation
 * e.g., "UK 6" → "UK6", "Medium" → "MEDIUM"
 */
export const normalizeSizeLabel = (label: string): string => {
  return label.trim().toUpperCase().replace(/\s+/g, "");
};

/**
 * Generates a deterministic EAN-13 barcode for a product variant
 * Uses SHA-256(productSku|sizeLabel) → 12-digit payload → add check digit
 *
 * Guarantees: Same product + size → same EAN-13
 * @param productSku - Primary product SKU (e.g., "NK-TSH-001")
 * @param sizeLabel - Size label (e.g., "Medium", "M", "UK 6")
 * @returns 13-digit EAN-13 barcode string
 */
export const buildVariantSku = (productSku: string, sizeLabel: string): string => {
  // Create deterministic key
  const key = `${productSku.trim()}|${normalizeSizeLabel(sizeLabel)}`;

  if (!key || key.length < 3) {
    throw new Error(`Invalid barcode key: "${key}"`);
  }

  // Use SHA-256 to generate 12 "random" digits
  const hash = createHash("sha256").update(key).digest();
  const headHex = hash.slice(0, 8).toString("hex");
  const num = BigInt(`0x${headHex}`) % BigInt(10) ** BigInt(12);
  const payload = num.toString().padStart(12, "0");

  // Compute and append EAN-13 check digit
  const checkDigit = computeEan13CheckDigit(payload);
  const ean13 = payload + checkDigit;

  // Validate before returning
  if (!validateEan13(ean13)) {
    throw new Error(`Generated invalid EAN-13: "${ean13}"`);
  }

  return ean13;
};

// ─── Barcode Format Detection ────────────────────────────────────────────────

export enum BarcodeFormat {
  EAN_13 = "EAN-13",
  UPC_A = "UPC-A",
  CODE_128 = "CODE-128",
  CODE_39 = "CODE-39",
  QR_CODE = "QR-CODE",
  UNKNOWN = "UNKNOWN",
}

/**
 * Detects likely barcode format based on length and content
 */
export const detectBarcodeFormat = (barcode: string): BarcodeFormat => {
  const cleaned = barcode.trim();

  if (!/^\d+$/.test(cleaned)) {
    return BarcodeFormat.UNKNOWN;
  }

  switch (cleaned.length) {
    case 13:
      return validateEan13(cleaned) ? BarcodeFormat.EAN_13 : BarcodeFormat.UNKNOWN;
    case 12:
      return BarcodeFormat.UPC_A;
    default:
      return BarcodeFormat.UNKNOWN;
  }
};

/**
 * Sanitizes scanned barcode input:
 * - Trims whitespace
 * - Removes common scan prefixes/suffixes
 * - Validates format
 */
export const sanitizeScannedBarcode = (raw: string): string | null => {
  if (!raw) return null;

  let cleaned = raw.trim();

  // Remove common barcode scanner prefixes (e.g., some scanners add ASCII chars)
  cleaned = cleaned.replace(/^[\s\x00-\x1F]+/, "").replace(/[\s\x00-\x1F]+$/, "");

  if (!cleaned) return null;

  // Only accept alphanumeric + hyphen (for human-readable SKUs)
  if (!/^[A-Z0-9\-]+$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
};

// ─── Generate barcode SVG/HTML ────────────────────────────────────────────────

/**
 * Generates bwip.js compatible barcode spec
 * Used server-side for label generation
 */
export interface BarcodeSpec {
  bcid: string; // barcode ID (e.g., "ean13")
  text: string;
  scale: number;
  height: number;
  includetext: boolean;
}

export const generateBarcodeSpec = (
  value: string,
  format: "ean13" | "upca" | "code128" = "ean13"
): BarcodeSpec => {
  const specs: Record<string, BarcodeSpec> = {
    ean13: {
      bcid: "ean13",
      text: value,
      scale: 2,
      height: 10,
      includetext: true,
    },
    upca: {
      bcid: "upca",
      text: value,
      scale: 2,
      height: 10,
      includetext: true,
    },
    code128: {
      bcid: "code128",
      text: value,
      scale: 2,
      height: 10,
      includetext: true,
    },
  };

  return specs[format] || specs.ean13;
};

export default {
  validateEan13,
  computeEan13CheckDigit,
  buildVariantSku,
  normalizeSizeLabel,
  detectBarcodeFormat,
  sanitizeScannedBarcode,
  generateBarcodeSpec,
};
