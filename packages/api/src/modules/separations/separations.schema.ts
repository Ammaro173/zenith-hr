import { z } from "zod";

export const createSeparationSchema = z.object({
  type: z.enum(["RESIGNATION", "TERMINATION", "RETIREMENT", "END_OF_CONTRACT"]),
  reason: z.string().min(10),
  lastWorkingDay: z.coerce.date(), // YYYY-MM-DD
  noticePeriodWaived: z.boolean().default(false),
});

export const updateSeparationSchema = z.object({
  separationId: z.string().uuid(),
  status: z
    .enum([
      "REQUESTED",
      "MANAGER_APPROVED",
      "HR_APPROVED",
      "CLEARANCE_IN_PROGRESS",
      "COMPLETED",
      "REJECTED",
    ])
    .optional(),
  reason: z.string().min(10).optional(),
  lastWorkingDay: z.coerce.date().optional(),
  noticePeriodWaived: z.boolean().optional(),
});

export const startClearanceSchema = z.object({
  separationId: z.string().uuid(),
});

export const updateChecklistSchema = z.object({
  checklistId: z.string().uuid(),
  status: z.enum(["PENDING", "CLEARED", "REJECTED"]),
  remarks: z.string().optional(),
});
