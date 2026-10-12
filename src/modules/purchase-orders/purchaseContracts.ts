import { z } from "zod";

const identifier = z.string().trim().min(1).max(128);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const money = z.number().finite().nonnegative().max(99_999_999.99).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
  "Money values may have at most two decimal places",
);

const poItemSchema = z.object({
  itemKind: z.literal("EXISTING_PRODUCT").optional(),
  lineGroupId: identifier.optional(),
  productId: identifier,
  sizeId: identifier,
  colour: optionalText(100),
  supplierReference: optionalText(200),
  notes: optionalText(1_000),
  quantity: z.number().int().positive().max(1_000_000),
  unitCost: money,
}).strict();

const provisionalPOItemSchema = z.object({
  itemKind: z.literal("PROVISIONAL_PRODUCT"),
  lineGroupId: identifier.optional(),
  productName: z.string().trim().min(1).max(300),
  proposedSku: optionalText(100),
  brandId: identifier,
  categoryId: identifier,
  styleModel: optionalText(200),
  colour: optionalText(100),
  sizeLabel: z.string().trim().min(1).max(100),
  supplierReference: optionalText(200),
  imageUrl: optionalText(2_000),
  expectedSellingPrice: money.optional(),
  notes: optionalText(1_000),
  quantity: z.number().int().positive().max(1_000_000),
  unitCost: money,
}).strict();

const purchaseOrderLineSchema = z.union([poItemSchema, provisionalPOItemSchema]);

function rejectDuplicateVariants(
  items: Array<z.infer<typeof purchaseOrderLineSchema>>,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const key = item.itemKind === "PROVISIONAL_PRODUCT"
      ? `provisional:${item.lineGroupId ?? item.productName}:${item.colour ?? ""}:${item.sizeLabel}`
      : `catalog:${item.productId}:${item.sizeId}`;
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        path: [index],
        message: "Duplicate product and size variants are not allowed",
      });
    }
    seen.add(key);
  });
}

export const createPurchaseOrderSchema = z.object({
  storeId: identifier,
  supplierId: identifier,
  notes: optionalText(2_000),
  expectedDeliveryDate: z.iso.date().nullable().optional(),
  items: z.array(purchaseOrderLineSchema).min(1).max(500),
}).strict().superRefine((value, context) => rejectDuplicateVariants(value.items, context));

export const updatePurchaseOrderSchema = z.object({
  supplierId: identifier.optional(),
  notes: z.string().trim().max(2_000).nullable().optional(),
  expectedDeliveryDate: z.iso.date().nullable().optional(),
  items: z.array(purchaseOrderLineSchema).min(1).max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one purchase order field is required").superRefine((value, context) => {
  if (value.items) rejectDuplicateVariants(value.items, context);
});

const receiptItemSchema = z.object({
  purchaseOrderItemId: identifier,
  receivedQuantity: z.number().int().positive().max(1_000_000),
  acceptedQuantity: z.number().int().nonnegative().max(1_000_000),
  rejectedQuantity: z.number().int().nonnegative().max(1_000_000),
  damagedQuantity: z.number().int().nonnegative().max(1_000_000),
  rejectionReason: optionalText(1_000),
  batchReference: optionalText(200),
  defectQuantity: z.number().int().positive().max(1_000_000).optional(),
  defectReason: optionalText(1_000),
  defectImageUrls: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
  unitCostActual: money.optional(),
  catalogResolution: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("LINK_EXISTING"),
      productId: identifier,
      sizeId: identifier,
    }).strict(),
    z.object({
      mode: z.literal("CREATE_PRODUCT"),
      sku: optionalText(100),
      sellingPrice: money.optional(),
      externalBarcode: optionalText(100),
    }).strict(),
  ]).optional(),
}).strict();

export const receivePurchaseOrderSchema = z.object({
  confirmationId: z.string().trim().min(8).max(128),
  receivedAt: z.iso.datetime({ offset: true }).optional(),
  receiptReference: optionalText(200),
  supplierInvoiceNumber: optionalText(200),
  notes: optionalText(2_000),
  items: z.array(receiptItemSchema).min(1).max(500),
}).strict().superRefine((value, context) => {
  const seen = new Set<string>();
  value.items.forEach((item, index) => {
    if (seen.has(item.purchaseOrderItemId)) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "purchaseOrderItemId"],
        message: "A purchase order line may appear only once per receipt",
      });
    }
    seen.add(item.purchaseOrderItemId);
    if (item.acceptedQuantity + item.rejectedQuantity + item.damagedQuantity !== item.receivedQuantity) {
      context.addIssue({
        code: "custom",
        path: ["items", index],
        message: "Accepted, rejected, and damaged quantities must equal received quantity",
      });
    }
    if (item.damagedQuantity > 0 && item.defectQuantity !== undefined && item.defectQuantity !== item.damagedQuantity) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "defectQuantity"],
        message: "Defect quantity must equal damaged quantity",
      });
    }
    if (item.damagedQuantity > 0 && !item.defectReason && !item.rejectionReason) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "defectReason"],
        message: "Defect reason is required when damaged quantity is recorded",
      });
    }
    if (item.damagedQuantity === 0 && (item.defectQuantity || item.defectReason || item.defectImageUrls?.length)) {
      context.addIssue({
        code: "custom",
        path: ["items", index],
        message: "Defect evidence requires a damaged quantity",
      });
    }
  });
});

export const closePurchaseOrderSchema = z.object({
  reason: z.string().trim().min(1).max(1_000),
}).strict();

export function contractError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "Invalid request";
}
