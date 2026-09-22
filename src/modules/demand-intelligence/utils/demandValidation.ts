import { z } from "zod";

export const visitOutcomeSchema = z.enum([
  "CONVERTED",
  "NOT_CONVERTED",
  "PARTIALLY_CONVERTED",
  "BROWSING",
]);
export const demandStatusSchema = z.enum([
  "FULFILLED",
  "PARTIALLY_FULFILLED",
  "UNFULFILLED",
  "ABANDONED",
]);
export const demandReasonSchema = z.enum([
  "OUT_OF_STOCK",
  "VARIANT_UNAVAILABLE",
  "PRODUCT_UNAVAILABLE",
  "BRAND_UNAVAILABLE",
  "FEATURE_UNAVAILABLE",
  "PRICE_TOO_HIGH",
  "COLOR_UNAVAILABLE",
  "SIZE_UNAVAILABLE",
  "CUSTOMER_CHANGED_MIND",
  "JUST_BROWSING",
  "OTHER",
]);

const attributesSchema = z.record(
  z.string().min(1).max(80),
  z.union([
    z.string().max(200),
    z.number().finite(),
    z.boolean(),
    z.array(z.string().max(100)).max(20),
  ])
);

export const demandRequestInputSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    requestedQuantity: z.number().int().positive().max(999).default(1),
    fulfilledQuantity: z.number().int().nonnegative().max(999).default(0),
    status: demandStatusSchema,
    reasonCode: demandReasonSchema,
    attributes: attributesSchema.optional().default({}),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.fulfilledQuantity > value.requestedQuantity) {
      context.addIssue({
        code: "custom",
        path: ["fulfilledQuantity"],
        message: "Fulfilled quantity cannot exceed requested quantity",
      });
    }
    if (value.status === "FULFILLED" && value.fulfilledQuantity !== value.requestedQuantity) {
      context.addIssue({
        code: "custom",
        path: ["fulfilledQuantity"],
        message: "Fulfilled requests must fulfil the requested quantity",
      });
    }
    if (
      (value.status === "UNFULFILLED" || value.status === "ABANDONED") &&
      value.fulfilledQuantity !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["fulfilledQuantity"],
        message: "Unfulfilled or abandoned requests cannot have fulfilled quantity",
      });
    }
    if (
      value.status === "PARTIALLY_FULFILLED" &&
      (value.fulfilledQuantity <= 0 || value.fulfilledQuantity >= value.requestedQuantity)
    ) {
      context.addIssue({
        code: "custom",
        path: ["fulfilledQuantity"],
        message: "Partially fulfilled quantity must be between zero and requested quantity",
      });
    }
    const nonDemand =
      value.reasonCode === "JUST_BROWSING" || value.reasonCode === "CUSTOMER_CHANGED_MIND";
    if (!nonDemand && !value.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Category is required for a demand request",
      });
    }
  });

const customerVisitBaseSchema = z.object({
  storeId: z.string().uuid(),
  visitedAt: z.iso.datetime().optional(),
  outcome: visitOutcomeSchema,
  linkedSaleId: z.string().uuid().optional(),
  source: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  requests: z.array(demandRequestInputSchema).max(20).default([]),
});

export const customerVisitInputSchema = customerVisitBaseSchema.superRefine((value, context) => {
  if (
    (value.outcome === "PARTIALLY_CONVERTED" || value.outcome === "NOT_CONVERTED") &&
    value.requests.length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["requests"],
      message: "This visit outcome requires a reason or demand request",
    });
  }
});

export const customerVisitPatchSchema = customerVisitBaseSchema
  .omit({ storeId: true, idempotencyKey: true })
  .partial();
