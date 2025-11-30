import { z } from "zod";

export const createSeparationSchema = z.object({
  type: z.enum(["RESIGNATION", "TERMINATION", "RETIREMENT", "END_OF_CONTRACT"]),
  reason: z.string().min(10),
  lastWorkingDay: z.string().date(), // YYYY-MM-DD
});

export const updateSeparationSchema = z.object({
  separationId: z.string().uuid(),
  status: z
    .enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "COMPLETED"])
    .optional(),
  reason: z.string().min(10).optional(),
  lastWorkingDay: z.string().date().optional(),
});

export const updateChecklistSchema = z.object({
  checklistId: z.string().uuid(),
  status: z.enum(["PENDING", "COMPLETED", "NOT_APPLICABLE"]),
});
