"use client";

import { Eye, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CompetencyRatingsSection,
  GoalAchievementSection,
  ManagerCommentsSection,
  ProbationDecisionSection,
  ReviewLogisticsSection,
  SelfReviewCommentsSection,
} from "./form-sections";
import type { GoalAchievementsMap } from "./performance-review-form-context";
import { PerformanceReviewFormProvider } from "./performance-review-form-context";
import { usePerformanceReviewForm } from "./use-performance-review-form";

interface PerformanceReviewFormProps {
  employeeId?: string;
  mode?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
  reviewId?: string;
}

export function PerformanceReviewForm({
  employeeId,
  reviewId,
  mode = "page",
  onSuccess,
  onCancel,
}: PerformanceReviewFormProps) {
  const goalAchievementsRef = useRef<GoalAchievementsMap>({});
  const [liveGoalCompletion, setLiveGoalCompletion] = useState<number | null>(
    null,
  );
  const {
    form,
    review,
    isLoading,
    isPending,
    permissions,
    isSaving,
    handleCancel,
    handleSaveDraft,
    goalBasedCompletion,
  } = usePerformanceReviewForm({
    reviewId,
    employeeId,
    onSuccess,
    onCancel,
    goalAchievementsRef,
  });

  // Reset live completion when this review has no goals / no goal section
  useEffect(() => {
    if (!review) {
      return;
    }
    const hasGoalSection =
      review.reviewType === "OBJECTIVE_SETTING" ||
      (review.reviewType === "ANNUAL_PERFORMANCE" &&
        (review.linkedObjectiveReviewId ||
          (review.goals && review.goals.length > 0)));
    if (!(hasGoalSection && review.goals?.length)) {
      setLiveGoalCompletion(null);
    }
  }, [review]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Review not found
      </div>
    );
  }

  const isReadOnly = ![
    permissions.canEditCompetencies,
    permissions.canEditManagerComment,
    permissions.canEditProbationDecision,
    permissions.canEditSelfComment,
    permissions.canManageGoals,
    permissions.canSaveDraft,
    permissions.canSubmit,
  ].some((value) => value);
  const isProbationFinalDecision =
    review.reviewType === "PROBATION" &&
    (review.probationConfirmationDecision === "CONFIRM_EMPLOYMENT" ||
      review.probationConfirmationDecision === "RECOMMEND_TERMINATION");
  const lockSubmittedReview =
    review.status === "SUBMITTED" &&
    !(review.reviewType === "PROBATION" && !isProbationFinalDecision);
  const hideBottomMetrics =
    mode === "sheet" && review.reviewType === "PROBATION";
  const probationFeedback =
    review.feedback && typeof review.feedback === "object"
      ? (review.feedback as Record<string, unknown>)
      : null;
  const showProbationDecisionSection =
    review.reviewType === "PROBATION" &&
    Boolean(
      permissions.canEditProbationDecision ||
        review.probationConfirmationDecision ||
        review.managerComment ||
        probationFeedback?.probationStrengthness ||
        probationFeedback?.probationWeakness ||
        probationFeedback?.probationPerformanceRate,
    );

  return (
    <div
      className={cn(
        "space-y-6",
        mode === "sheet" ? "px-1" : "mx-auto max-w-4xl",
      )}
    >
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <PerformanceReviewFormProvider
          form={form}
          formReadOnly={lockSubmittedReview}
          goalAchievementsRef={goalAchievementsRef}
          isEditing={true}
          permissions={permissions}
          reviewId={reviewId}
          setLiveGoalCompletion={setLiveGoalCompletion}
        >
          <div className="space-y-10">
            {isReadOnly && (
              <Alert>
                <Eye className="size-4" />
                <AlertTitle>Read-only review</AlertTitle>
                <AlertDescription>
                  You can view this review, but you cannot edit fields or take
                  review actions in its current state.
                </AlertDescription>
              </Alert>
            )}
            <ReviewLogisticsSection review={review} />
            {showProbationDecisionSection && <ProbationDecisionSection />}
            <CompetencyRatingsSection competencies={review.competencies} />
            {(permissions.canEditSelfComment || review.selfComment) && (
              <SelfReviewCommentsSection />
            )}
            {(permissions.canEditManagerComment || review.managerComment) && (
              <ManagerCommentsSection />
            )}
            {((review.reviewType === "ANNUAL_PERFORMANCE" &&
              (review.linkedObjectiveReviewId ||
                (review.goals && review.goals.length > 0))) ||
              review.reviewType === "OBJECTIVE_SETTING") && (
              <GoalAchievementSection
                annualReview={review}
                objectiveReviewId={
                  review.reviewType === "OBJECTIVE_SETTING"
                    ? review.id
                    : (review.linkedObjectiveReviewId ?? review.id)
                }
              />
            )}
          </div>
        </PerformanceReviewFormProvider>

        {/* Bottom Action Bar */}
        <div
          className={cn(
            "sticky bottom-0 flex items-center gap-3 border-t bg-background/95 pt-6 backdrop-blur-sm",
            hideBottomMetrics ? "justify-end" : "justify-between",
          )}
        >
          {/* Left side: Completion status */}
          {!hideBottomMetrics && (
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground text-sm">
                Completion:{" "}
                <span className="font-semibold text-foreground">
                  {(() => {
                    if (
                      liveGoalCompletion !== null &&
                      liveGoalCompletion !== undefined
                    ) {
                      return `${liveGoalCompletion}%`;
                    }
                    if (goalBasedCompletion !== undefined) {
                      return `${goalBasedCompletion}%`;
                    }
                    return `${review.completionPercentage ?? 0}%`;
                  })()}
                </span>
              </div>
              {review.totalScore !== null &&
                review.totalScore !== undefined && (
                  <div className="text-muted-foreground text-sm">
                    Score:{" "}
                    <span className="font-semibold text-foreground">
                      {review.totalScore}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Right side: Actions – hidden when review is already submitted */}
          {!lockSubmittedReview && (
            <div className="flex items-center gap-3">
              {permissions.canSaveDraft && (
                <Button
                  disabled={isSaving}
                  onClick={handleSaveDraft}
                  type="button"
                  variant="outline"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Save Draft
                </Button>
              )}
              <Button onClick={handleCancel} type="button" variant="ghost">
                Cancel
              </Button>
              {permissions.canSubmit && (
                <form.Subscribe
                  selector={(state) => ({
                    canSubmit: state.canSubmit,
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ canSubmit, isSubmitting }) => (
                    <Button
                      disabled={!canSubmit || isSubmitting || isPending}
                      type="submit"
                    >
                      {(isSubmitting || isPending) && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Submit Review
                    </Button>
                  )}
                </form.Subscribe>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
