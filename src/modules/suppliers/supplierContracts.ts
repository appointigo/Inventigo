import { z } from "zod";

const optionalContact = (max: number) => z.string().trim().max(max).optional();

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactPerson: optionalContact(200),
  email: z.union([z.email().max(320), z.literal("")]).optional(),
  phone: optionalContact(50),
  address: optionalContact(1_000),
  isActive: z.boolean().default(true),
}).strict();

export const updateSupplierSchema = createSupplierSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "At least one supplier field is required",
);
