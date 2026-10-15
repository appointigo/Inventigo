import type { FeatureValue } from "./accessPolicy";

export type FeatureRow = {
  featureKey: string;
  value: unknown;
  feature: { valueType: "BOOLEAN" | "INTEGER" | "ENUM" | "SET" | "DECIMAL" };
};

function parseFeatureValue(row: FeatureRow): FeatureValue {
  const { value } = row;
  switch (row.feature.valueType) {
    case "BOOLEAN":
      if (typeof value === "boolean") return value;
      break;
    case "INTEGER":
      if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
      break;
    case "ENUM":
      if (typeof value === "string" && value.length > 0) return value;
      break;
    case "SET":
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
      break;
    case "DECIMAL":
      if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) return value;
      break;
  }
  throw new Error(`Invalid value for subscription feature ${row.featureKey}`);
}

export function featureMapFromRows(rows: readonly FeatureRow[]): Record<string, FeatureValue> {
  return Object.fromEntries(rows.map((row) => [row.featureKey, parseFeatureValue(row)]));
}
