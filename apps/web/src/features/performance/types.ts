import type { usePerformanceReviewForm } from "./use-performance-review-form";

// Re-export schema types for convenience
export type {
  CreateGoalInput,
  CreateReviewInput,
  GoalStatus,
  ReviewStatus,
  ReviewType,
  UpdateGoalInput,
  UpdateReviewInput,
} from "@zenith-hr/api/modules/performance/performance.schema";

// Form values type for the performance review form
export interface ReviewFormValues {
  status:
    | "DRAFT"
    | "SELF_REVIEW"
    | "MANAGER_REVIEW"
    | "IN_REVIEW"
    | "SUBMITTED"
    | "ACKNOWLEDGED"
    | "COMPLETED"
    | undefined;
  managerComment: string;
  selfComment: string;
  competencyRatings: {
    competencyId: string;
    rating: number | undefined;
    justification: string;
  }[];
}

// Form type for context - inferred from the hook's return type
export type PerformanceReviewFormType = ReturnType<
  typeof usePerformanceReviewForm
>["form"];
