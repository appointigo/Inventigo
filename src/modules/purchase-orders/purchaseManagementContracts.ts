import { z } from "zod";

const id = z.string().trim().min(1).max(128);
const money = z.number().finite().nonnegative().max(999_999_999.99);

export const supplierBillSchema = z.object({
  storeId: id,
  supplierId: id,
  purchaseOrderId: id.optional(),
  supplierInvoiceNumber: z.string().trim().min(1).max(200),
  invoiceDate: z.iso.date(),
  dueDate: z.iso.date().nullable().optional(),
  additionalCharges: money.default(0),
  discountAmount: money.default(0),
  taxAmount: money.default(0),
  notes: z.string().trim().max(2_000).optional(),
  lines: z.array(z.object({
    purchaseOrderItemId: id.optional(),
    variantId: id.optional(),
    description: z.string().trim().min(1).max(500),
    quantity: z.number().finite().positive().max(1_000_000),
    unitCost: money,
    taxAmount: money.default(0),
    discountAmount: money.default(0),
  }).strict()).min(1).max(500),
  allocations: z.array(z.object({
    receiptId: id,
    receiptItemId: id.optional(),
    quantity: z.number().finite().positive().max(1_000_000),
    amount: money,
  }).strict()).max(500).default([]),
}).strict();

export const supplierClaimSchema = z.object({
  discrepancyId: id,
  requestedResolution: z.enum(["RETURN", "REPLACEMENT", "CREDIT_NOTE"]),
  quantity: z.number().int().positive().max(1_000_000),
  expectedReplacementAt: z.iso.date().nullable().optional(),
  returnAuthorization: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2_000).optional(),
}).strict();

export const supplierClaimTransitionSchema = z.object({
  action: z.enum(["RETURN", "REPLACEMENT", "REQUEST_CREDIT", "RECORD_CREDIT", "RESOLVE", "CANCEL"]),
  returnAuthorization: z.string().trim().min(1).max(200).optional(),
  billId: id.optional(),
  creditNoteNumber: z.string().trim().min(1).max(200).optional(),
  creditAmount: money.optional(),
  notes: z.string().trim().max(2_000).optional(),
}).strict();

export const directPurchaseDetailsSchema = z.object({
  idempotencyKey: id,
  supplierInvoiceNumber: z.string().trim().min(1).max(200).optional(),
  invoiceDate: z.iso.date().optional(),
  dueDate: z.iso.date().nullable().optional(),
  payment: z.object({
    amount: z.number().finite().positive().max(999_999_999.99),
    accountId: id.optional(),
    method: z.enum(["CASH", "CARD", "UPI"]),
    paymentDate: z.iso.date(),
    reference: z.string().trim().max(200).optional(),
  }).strict().optional(),
  resolutions: z.record(z.string(), z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("LINK_EXISTING"), productId: id, sizeId: id }).strict(),
    z.object({ mode: z.literal("CREATE_PRODUCT"), sku: z.string().trim().min(1).max(100).optional(), sellingPrice: money.optional(), externalBarcode: z.string().trim().min(1).max(100).optional() }).strict(),
  ])).default({}),
}).strict();

export type SupplierBillInput = z.infer<typeof supplierBillSchema>;
export type SupplierClaimInput = z.infer<typeof supplierClaimSchema>;
export type SupplierClaimTransitionInput = z.infer<typeof supplierClaimTransitionSchema>;
