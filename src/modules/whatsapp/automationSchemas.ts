import { z } from "zod";
export const automationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  trigger: z.enum(["SALE_COMPLETED", "PAYMENT_DUE", "CUSTOMER_INACTIVE"]),
  storeId: z.string().uuid().nullable().optional(),
  templateDefinitionId: z.string().min(1),
  isActive: z.boolean().default(false),
  conditions: z.object({
    minAmount: z.number().nonnegative().optional(),
    daysAfter: z.number().int().min(1).max(365).optional(),
  }),
});
