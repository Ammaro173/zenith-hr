import { z } from "zod";

export const createCycleSchema = z.object({
  name: z.string().min(3),
  startDate: z.string().datetime(), // ISO date string
  endDate: z.string().datetime(),
});

export const createReviewSchema = z.object({
  cycleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  reviewerId: z.string().uuid().optional(),
});

export const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  overallRating: z.number().min(1).max(5).optional(),
  overallComment: z.string().optional(),
  feedback: z.record(z.string(), z.unknown()).optional(),
});

export const createGoalSchema = z.object({
  reviewId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  weight: z.number().min(0).max(100).optional(),
});

export const updateGoalSchema = z.object({
  goalId: z.string().uuid(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
});
