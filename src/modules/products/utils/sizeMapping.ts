import type { Category } from "@/modules/categories/types";

export type SizeOption = Category["sizes"][number];

export type SizeLookupCache = {
  byId: Map<string, SizeOption>;
  byLabel: Map<string, SizeOption>;
};

export type ResolveSizeLabelInput = {
  sizeId: string;
  fallbackLabel?: string | null;
  cache: SizeLookupCache;
  unknownLabel?: string;
};

const normalizeLabel = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

export const buildSizeLookupCache = (categories: Category[]): SizeLookupCache => {
  const byId = new Map<string, SizeOption>();
  const byLabel = new Map<string, SizeOption>();

  categories.forEach((category) => {
    category.sizes.forEach((size) => {
      byId.set(size.id, size);

      const labelKey = normalizeLabel(size.label);
      if (!byLabel.has(labelKey)) {
        byLabel.set(labelKey, size);
      }
    });
  });

  return { byId, byLabel };
};

export const resolveSizeLabel = ({
  sizeId,
  fallbackLabel,
  cache,
  unknownLabel = "Unknown Size",
}: ResolveSizeLabelInput): string => {
  const byIdMatch = cache.byId.get(sizeId);
  if (byIdMatch) {
    return byIdMatch.label;
  }

  if (fallbackLabel) {
    const byLabelMatch = cache.byLabel.get(normalizeLabel(fallbackLabel));
    if (byLabelMatch) {
      return byLabelMatch.label;
    }
  }

  return unknownLabel;
};