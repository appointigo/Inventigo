import { z } from "zod";
export const audienceSchema = z
  .object({
    tags: z.array(z.string().trim().min(1)).max(20).default([]),
    minTotalSpent: z.number().nonnegative().optional(),
    maxTotalSpent: z.number().nonnegative().optional(),
    lastVisitAfter: z.string().datetime().optional(),
    lastVisitBefore: z.string().datetime().optional(),
  })
  .refine(
    (v) =>
      v.minTotalSpent === undefined ||
      v.maxTotalSpent === undefined ||
      v.minTotalSpent <= v.maxTotalSpent,
    { message: "Minimum spend cannot exceed maximum spend" }
  );
const campaignFields = {
  name: z.string().trim().min(2).max(120),
  templateDefinitionId: z.string().uuid().or(z.string().min(1)),
  stores: z.array(z.object({ storeId: z.string().uuid(), senderId: z.string().uuid() })).min(1),
  audience: audienceSchema,
  scheduledAt: z.string().datetime().nullable().optional(),
};

export const campaignSchema = z
  .object(campaignFields)
  .refine((v) => new Set(v.stores.map((s) => s.storeId)).size === v.stores.length, {
    message: "Select one sender per Store",
  });
export const campaignPreviewSchema = z.object({
  stores: campaignFields.stores,
  audience: campaignFields.audience,
});
