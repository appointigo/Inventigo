import { z } from "zod";

export const followUpStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const followUpPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH"]);
export const followUpTypeSchema = z.enum(["GENERAL", "REPEAT_PURCHASE", "AT_RISK", "RESTOCK", "RETURN_RESOLUTION", "OTHER"]);

const optionalId = z.string().uuid().nullish();
const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const createFollowUpSchema = z.object({
  customerId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  assignedUserId: optionalId,
  visitId: optionalId,
  demandRequestId: optionalId,
  type: followUpTypeSchema,
  status: followUpStatusSchema.optional(),
  priority: followUpPrioritySchema.optional(),
  title: z.string().trim().min(1).max(160),
  description: optionalText(1000),
  reason: optionalText(500),
  note: optionalText(1000),
  dueAt: z.iso.datetime().nullish(),
  dedupeKey: optionalText(160),
});

export const updateFollowUpSchema = z.object({
  status: followUpStatusSchema.optional(),
  priority: followUpPrioritySchema.optional(),
  assignedUserId: optionalId,
  dueAt: z.iso.datetime().nullish(),
  title: z.string().trim().min(1).max(160).optional(),
  description: optionalText(1000),
  note: optionalText(1000),
}).refine(value => Object.keys(value).length > 0, "At least one change is required");
