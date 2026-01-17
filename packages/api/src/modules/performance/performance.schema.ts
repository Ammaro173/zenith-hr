import { z } from "zod";

// ============================================================================
// Constants - Exported for UI components to use
// ============================================================================

/**
 * Review types matching the client flow diagram tabs
 */
export const REVIEW_TYPES = [
  {
    value: "PROBATION",
    label: "Probation Review",
    description: "Initial probation period assessment for new employees.",
  },
  {
    value: "ANNUAL_PERFORMANCE",
    label: "Annual Performance",
    description: "Yearly performance review and goal assessment.",
  },
  {
    value: "OBJECTIVE_SETTING",
    label: "Objective Setting",
    description: "Setting goals and objectives for the upcoming period.",
  },
] as const;

export type ReviewType = (typeof REVIEW_TYPES)[number]["value"];

/**
 * Review status flow
 */
export const REVIEW_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "gray" },
  { value: "SELF_REVIEW", label: "Self Review", color: "blue" },
  { value: "MANAGER_REVIEW", label: "Manager Review", color: "yellow" },
  { value: "IN_REVIEW", label: "In Review", color: "orange" },
  { value: "SUBMITTED", label: "Submitted", color: "purple" },
  { value: "ACKNOWLEDGED", label: "Acknowledged", color: "green" },
  { value: "COMPLETED", label: "Completed", color: "green" },
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number]["value"];

/**
 * Competency rating scale (1-5)
 */
export const COMPETENCY_RATINGS = [
  {
    value: 1,
    label: "Needs Improvement",
    shortLabel: "1",
    description: "Performance is significantly below expectations",
    color: "red",
    requiresJustification: true,
  },
  {
    value: 2,
    label: "Below Expectations",
    shortLabel: "2",
    description: "Performance partially meets expectations",
    color: "orange",
    requiresJustification: true,
  },
  {
    value: 3,
    label: "Meets Expectations",
    shortLabel: "3",
    description: "Performance fully meets role requirements",
    color: "yellow",
    requiresJustification: false,
  },
  {
    value: 4,
    label: "Exceeds Expectations",
    shortLabel: "4",
    description: "Performance exceeds role requirements",
    color: "green",
    requiresJustification: false,
  },
  {
    value: 5,
    label: "Outstanding",
    shortLabel: "5",
    description: "Exceptional performance, role model",
    color: "blue",
    requiresJustification: false,
  },
] as const;

/**
 * Goal status options
 */
export const GOAL_STATUSES = [
  { value: "PENDING", label: "Pending", color: "gray" },
  { value: "IN_PROGRESS", label: "In Progress", color: "blue" },
  { value: "COMPLETED", label: "Completed", color: "green" },
  { value: "CANCELLED", label: "Cancelled", color: "red" },
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number]["value"];

/**
 * Cycle status options
 */
export const CYCLE_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "gray" },
  { value: "ACTIVE", label: "Active", color: "green" },
  { value: "COMPLETED", label: "Completed", color: "blue" },
  { value: "ARCHIVED", label: "Archived", color: "gray" },
] as const;

export type CycleStatus = (typeof CYCLE_STATUSES)[number]["value"];

// ============================================================================
// Zod Schemas
// ============================================================================

// --- Cycle Schemas ---

export const createCycleSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  startDate: z.string().datetime(), // ISO date string
  endDate: z.string().datetime(),
});

export const createCycleDefaults: z.input<typeof createCycleSchema> = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
};

export const updateCycleSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

// --- Review Schemas ---

export const createReviewSchema = z.object({
  cycleId: z.string().uuid(),
  employeeId: z.string(),
  reviewerId: z.string().optional(),
  reviewType: z.enum(["PROBATION", "ANNUAL_PERFORMANCE", "OBJECTIVE_SETTING"]),
  reviewPeriodStart: z.string().datetime().optional(),
  reviewPeriodEnd: z.string().datetime().optional(),
});

export const createReviewDefaults: z.input<typeof createReviewSchema> = {
  cycleId: "",
  employeeId: "",
  reviewerId: undefined,
  reviewType: "ANNUAL_PERFORMANCE",
  reviewPeriodStart: undefined,
  reviewPeriodEnd: undefined,
};

const competencyRatingSchema = z.object({
  competencyId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  justification: z.string().optional(),
});

export const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  status: z
    .enum([
      "DRAFT",
      "SELF_REVIEW",
      "MANAGER_REVIEW",
      "IN_REVIEW",
      "SUBMITTED",
      "ACKNOWLEDGED",
      "COMPLETED",
    ])
    .optional(),
  managerComment: z.string().optional(),
  selfComment: z.string().optional(),
  overallRating: z.number().min(1).max(5).optional(),
  feedback: z.record(z.string(), z.unknown()).optional(),
});

export const saveDraftSchema = z.object({
  reviewId: z.string().uuid(),
  competencyRatings: z.array(competencyRatingSchema).optional(),
  managerComment: z.string().optional(),
  selfComment: z.string().optional(),
});

export const submitReviewSchema = z.object({
  reviewId: z.string().uuid(),
});

// --- Competency Schemas ---

export const createCompetencySchema = z.object({
  reviewId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().min(0).max(100).default(20),
});

export const updateCompetencySchema = z
  .object({
    competencyId: z.string().uuid(),
    rating: z.number().min(1).max(5).optional(),
    justification: z.string().optional(),
  })
  .refine(
    (data) => {
      // If rating is below 3, justification is required
      if (data.rating && data.rating < 3 && !data.justification) {
        return false;
      }
      return true;
    },
    {
      message: "Justification is required for ratings below expectations",
      path: ["justification"],
    },
  );

export const batchUpdateCompetenciesSchema = z.object({
  reviewId: z.string().uuid(),
  competencies: z.array(
    z.object({
      competencyId: z.string().uuid(),
      rating: z.number().min(1).max(5).optional(),
      justification: z.string().optional(),
    }),
  ),
});

// --- Goal Schemas ---

export const createGoalSchema = z.object({
  reviewId: z.string().uuid(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  weight: z.number().min(0).max(100).optional(),
});

export const createGoalDefaults: z.input<typeof createGoalSchema> = {
  reviewId: "",
  title: "",
  description: "",
  targetDate: undefined,
  weight: undefined,
};

export const updateGoalSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
});

export const deleteGoalSchema = z.object({
  goalId: z.string().uuid(),
});

// --- Competency Template Schemas ---

export const createCompetencyTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().min(0).max(100).default(20),
  category: z.string().optional(),
  reviewType: z
    .enum(["PROBATION", "ANNUAL_PERFORMANCE", "OBJECTIVE_SETTING"])
    .optional(),
  displayOrder: z.number().int().default(0),
});

// --- Query Schemas ---

export const getReviewsSchema = z.object({
  cycleId: z.string().uuid().optional(),
  employeeId: z.string().optional(),
  reviewerId: z.string().optional(),
  status: z
    .array(
      z.enum([
        "DRAFT",
        "SELF_REVIEW",
        "MANAGER_REVIEW",
        "IN_REVIEW",
        "SUBMITTED",
        "ACKNOWLEDGED",
        "COMPLETED",
      ]),
    )
    .optional(),
  reviewType: z
    .array(z.enum(["PROBATION", "ANNUAL_PERFORMANCE", "OBJECTIVE_SETTING"]))
    .optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});

export type GetReviewsInput = z.infer<typeof getReviewsSchema>;

// ============================================================================
// Type Exports - Infer types from schemas
// ============================================================================

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

export type CreateCompetencyInput = z.infer<typeof createCompetencySchema>;
export type UpdateCompetencyInput = z.infer<typeof updateCompetencySchema>;
export type BatchUpdateCompetenciesInput = z.infer<
  typeof batchUpdateCompetenciesSchema
>;

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
