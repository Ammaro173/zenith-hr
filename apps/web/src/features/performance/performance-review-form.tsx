"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CompetencyRatingsSection,
  FutureGoalsSection,
  ManagerCommentsSection,
  ReviewLogisticsSection,
} from "./form-sections";
import { PerformanceReviewFormProvider } from "./performance-review-form-context";
import { usePerformanceReviewForm } from "./use-performance-review-form";

interface PerformanceReviewFormProps {
  mode?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
  reviewId: string;
}

export function PerformanceReviewForm({
  reviewId,
  mode = "page",
  onSuccess,
  onCancel,
}: PerformanceReviewFormProps) {
  const {
    form,
    review,
    isLoading,
    isPending,
    isSaving,
    handleCancel,
    handleSaveDraft,
  } = usePerformanceReviewForm({
    reviewId,
    onSuccess,
    onCancel,
  });

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
          isEditing={true}
          reviewId={reviewId}
        >
          <div className="space-y-10">
            <ReviewLogisticsSection review={review} />
            <CompetencyRatingsSection competencies={review.competencies} />
            <ManagerCommentsSection />
            <FutureGoalsSection goals={review.goals} reviewId={reviewId} />
          </div>
        </PerformanceReviewFormProvider>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background/95 pt-6 backdrop-blur-sm">
          {/* Left side: Completion status */}
          <div className="flex items-center gap-4">
            <div className="text-muted-foreground text-sm">
              Completion:{" "}
              <span className="font-semibold text-foreground">
                {review.completionPercentage ?? 0}%
              </span>
            </div>
            {review.totalScore && (
              <div className="text-muted-foreground text-sm">
                Score:{" "}
                <span className="font-semibold text-foreground">
                  {review.totalScore}
                </span>
              </div>
            )}
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-3">
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
            <Button onClick={handleCancel} type="button" variant="ghost">
              Cancel
            </Button>
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
          </div>
        </div>
      </form>
    </div>
  );
}
