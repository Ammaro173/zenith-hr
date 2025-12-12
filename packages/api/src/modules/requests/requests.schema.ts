import { z } from "zod";

// Base position details schema
const positionDetailsSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  description: z.string().optional(),
});

const budgetDetailsSchema = z.object({
  currency: z.string().min(1).default("USD"),
  notes: z.string().optional(),
});

export const createRequestSchema = z
  .object({
    requestType: z.enum(["NEW_POSITION", "REPLACEMENT"]),
    isBudgeted: z.boolean().default(false),
    replacementForUserId: z.string().uuid().optional(),
    contractDuration: z.enum(["FULL_TIME", "TEMPORARY", "CONSULTANT"]),
    justificationText: z.string().min(1),
    salaryRangeMin: z.number().positive(),
    salaryRangeMax: z.number().positive(),
    positionDetails: positionDetailsSchema,
    budgetDetails: budgetDetailsSchema,
  })
  .refine(
    (data) =>
      data.requestType === "NEW_POSITION" ||
      (!!data.replacementForUserId && data.requestType === "REPLACEMENT"),
    {
      message: "replacementForUserId is required for replacement requests",
      path: ["replacementForUserId"],
    }
  )
  .refine((data) => data.salaryRangeMin <= data.salaryRangeMax, {
    message: "salaryRangeMin cannot exceed salaryRangeMax",
    path: ["salaryRangeMin"],
  });

export const updateRequestSchema = createRequestSchema.partial();

// Transition schema
export const transitionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "REQUEST_CHANGE", "HOLD"]),
  comment: z.string().optional(),
});
