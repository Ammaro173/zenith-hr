import { z } from "zod";

// Base position details schema
export const basePositionDetailsSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  justification: z.string().min(1),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
});

// IT-specific fields
export const itPositionDetailsSchema = basePositionDetailsSchema.extend({
  techStack: z.array(z.string()).optional(),
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD"]).optional(),
});

// Sales-specific fields
export const salesPositionDetailsSchema = basePositionDetailsSchema.extend({
  commission: z.number().positive().optional(),
  territory: z.string().optional(),
});

// Budget details schema
export const budgetDetailsSchema = z.object({
  salaryMin: z.number().positive(),
  salaryMax: z.number().positive(),
  currency: z.string().default("USD"),
  codes: z.array(z.string()).optional(),
});

// Create request schema (dynamic based on department)
export const createRequestSchema = z.object({
  positionDetails: z.union([
    basePositionDetailsSchema,
    itPositionDetailsSchema,
    salesPositionDetailsSchema,
  ]),
  budgetDetails: budgetDetailsSchema,
});

// Update request schema
export const updateRequestSchema = createRequestSchema.partial();

// Transition schema
export const transitionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "REQUEST_CHANGE", "HOLD"]),
  comment: z.string().optional(),
});
