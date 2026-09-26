import { z } from "zod";

export const demoRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  businessName: z.string().trim().min(2).max(120),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+ ()-]{8,18}$/),
  email: z.email().max(200),
  city: z.string().trim().min(2).max(100),
  businessType: z.enum([
    "Clothing & Apparel",
    "Accessories",
    "Footwear",
    "Electronics",
    "Other retail",
  ]),
  storeCount: z.enum(["1", "2-5", "6-20", "21+"]),
  message: z.string().trim().max(1000).optional().default(""),
  website: z.string().max(0).optional().default(""),
});
