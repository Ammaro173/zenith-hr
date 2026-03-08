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

export interface PerformanceReviewPermissions {
  canCreateCompetencies: boolean;
  canDirectlyEditStatus: boolean;
  canEditCompetencies: boolean;
  canEditManagerComment: boolean;
  canEditOverallRating: boolean;
  canEditProbationDecision: boolean;
  canEditSelfComment: boolean;
  canManageGoals: boolean;
  canSaveDraft: boolean;
  canSubmit: boolean;
}

// Form values type for the performance review form
export interface ReviewFormValues {
  competencyRatings: {
    competencyId: string;
    rating: number | undefined;
    justification: string;
  }[];
  managerComment: string;
  probationConfirmationDecision?:
    | "CONFIRM_EMPLOYMENT"
    | "EXTEND_PROBATION"
    | "RECOMMEND_TERMINATION";
  selfComment: string;
  status:
    | "DUE"
    | "SENT_TO_MANAGER"
    | "SELF_REVIEW"
    | "AWAITING_MANAGER_REVIEW"
    | "SUBMITTED"
    | "HR_REVIEWED"
    | "COMPLETED"
    | "OVERDUE"
    | undefined;
}

// Form type for context - inferred from the hook's return type
export type PerformanceReviewFormType = ReturnType<
  typeof usePerformanceReviewForm
>["form"];
