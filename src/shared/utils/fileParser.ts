/**
 * Browser-side file parser for Bulk Upload.
 * Parses .csv and .xlsx files entirely in the browser — no server call.
 * Strips columns whose key starts with '_' (e.g. the _status helper column in Excel templates).
 *
 * Architecture note:
 * - CSV: papaparse (isomorphic, zero deps)
 * - XLSX: xlsx/SheetJS Community (browser-safe ArrayBuffer API)
 * - This file must only be imported in "use client" components.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Parse a CSV or XLSX file in the browser.
 * Returns normalised headers and rows with string values.
 * Throws a user-readable error if the file cannot be parsed.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") return parseCsv(file);
  if (ext === "xlsx" || ext === "xls") return parseXlsx(file);

  throw new Error(
    `Unsupported file type ".${ext}". Please upload a .csv or .xlsx file.`
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize a header string to snake_case
 * "Brand Name" → "brand_name"
 * "brand name" → "brand_name"
 * "BRAND_NAME" → "brand_name"
 * "brand_name" → "brand_name" (no change)
 */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_") // replace spaces with underscores
    .replace(/[^a-z0-9_]/g, ""); // remove invalid characters
}

function stripHelperColumns(
  headers: string[],
  rows: Record<string, string>[]
): ParsedFile {
  // Normalize all headers to snake_case
  const normalizedHeaders = headers.map(normalizeHeader);
  const cleanHeaders = normalizedHeaders.filter((h) => !h.startsWith("_"));
  
  // Build header mapping: original → normalized
  const headerMap = new Map<string, string>();
  headers.forEach((orig, i) => {
    headerMap.set(orig, normalizedHeaders[i]);
  });

  const cleanRows = rows
    .map((row) => {
      const out: Record<string, string> = {};
      for (const [origKey, value] of Object.entries(row)) {
        const normalizedKey = headerMap.get(origKey) || normalizeHeader(origKey);
        if (!normalizedKey.startsWith("_")) out[normalizedKey] = value;
      }
      return out;
    })
    // Skip rows where every meaningful column is blank (e.g. template pre-allocated rows)
    .filter((row) => Object.values(row).some((v) => v !== ""));
  return { headers: cleanHeaders, rows: cleanRows };
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => (typeof v === "string" ? v.trim() : v),
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(result.errors[0].message));
          return;
        }
        const headers = result.meta.fields ?? [];
        resolve(stripHelperColumns(headers, result.data));
      },
      error: (err: Error) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Prefer "Data" sheet if it exists (generated templates), fallback to first visible sheet
  let sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === "data");
  if (!sheetName) {
    // Fallback to first visible sheet (not hidden)
    sheetName = workbook.SheetNames[0];
  }
  if (!sheetName) throw new Error("Excel file has no worksheets.");

  const sheet = workbook.Sheets[sheetName];

  // raw: false converts numbers to strings with locale formatting — we override this:
  // defval: '' fills missing cells with empty string
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(raw[0]).map((h) => h.trim());
  const rows = raw.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k.trim()] = String(v ?? "").trim();
    }
    return out;
  });

  return stripHelperColumns(headers, rows);
}
