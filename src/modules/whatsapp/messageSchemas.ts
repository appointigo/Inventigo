import { z } from "zod";

export const testMessageSchema = z.object({
  storeId: z.string().uuid(),
  recipient: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid international WhatsApp number"),
  senderPurpose: z.enum(["DEFAULT", "TRANSACTIONAL", "MARKETING", "SUPPORT"]),
  template: z.object({ key: z.string().min(1), language: z.string().min(2), version: z.number().int().positive().optional() }),
  variables: z.record(z.string(), z.string().max(1024)).default({}),
});

export const messageActivityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["QUEUED", "SUBMITTED", "SENT", "DELIVERED", "READ", "FAILED"]).optional(),
  purpose: z.enum(["INVOICE", "PAYMENT", "MARKETING", "ORDER", "SUPPORT", "OTP", "OTHER"]).optional(),
  storeId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
});
