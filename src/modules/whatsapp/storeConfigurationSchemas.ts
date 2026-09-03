import { z } from "zod";
export const senderMappingSchema = z.object({
  storeId: z.string().uuid(),
  phoneNumberId: z.string().uuid(),
  purpose: z.enum(["DEFAULT", "TRANSACTIONAL", "MARKETING", "SUPPORT"]),
  priority: z.number().int().min(0).max(1000),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});
export const storeProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  signature: z.string().trim().max(500).nullable().optional(),
  supportPhone: z
    .string()
    .trim()
    .max(32)
    .regex(/^\+?[0-9 ()-]*$/, "Support phone has an invalid format")
    .nullable()
    .optional(),
  defaultLanguage: z
    .string()
    .trim()
    .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/, "Use a language code such as en or en_US"),
});
