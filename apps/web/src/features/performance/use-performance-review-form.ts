import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";
import type { PerformanceReviewPermissions, ReviewFormValues } from "./types";

// Default values for the form
const defaultFormValues: ReviewFormValues = {
  status: undefined,
  managerComment: "",
  selfComment: "",
  competencyRatings: [],
  probationConfirmationDecision: undefined,
};

interface UsePerformanceReviewFormProps {
  autoSaveEnabled?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  reviewId?: string;
}

export function usePerformanceReviewForm({
  reviewId,
  onSuccess,
  onCancel,
  autoSaveEnabled = true,
}: UsePerformanceReviewFormProps = {}) {
  const queryClient = useQueryClient();
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch existing review if editing
  const { data: review, isLoading: isLoadingReview } = useQuery(
    orpc.performance.getReview.queryOptions({
      input: { reviewId: reviewId ?? "" },
      enabled: !!reviewId,
    }),
  );

  const permissions: PerformanceReviewPermissions = review?.permissions ?? {
    canCreateCompetencies: false,
    canDirectlyEditStatus: false,
    canEditCompetencies: false,
    canEditManagerComment: false,
    canEditOverallRating: false,
    canEditProbationDecision: false,
    canEditSelfComment: false,
    canManageGoals: false,
    canSaveDraft: false,
    canSubmit: false,
  };

  const buildDraftPayload = useCallback(
    (values: ReviewFormValues) => {
      const competencyRatings = permissions.canEditCompetencies
        ? values.competencyRatings
            .filter((c) => c.rating !== undefined)
            .map((c) => ({
              competencyId: c.competencyId,
              rating: c.rating as number,
              justification: c.justification || undefined,
            }))
        : [];

      return {
        competencyRatings,
        managerComment: permissions.canEditManagerComment
          ? values.managerComment || undefined
          : undefined,
        selfComment: permissions.canEditSelfComment
          ? values.selfComment || undefined
          : undefined,
      };
    },
    [permissions],
  );

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: (data: {
      reviewId: string;
      competencyRatings?: Array<{
        competencyId: string;
        rating: number;
        justification?: string;
      }>;
      managerComment?: string;
      selfComment?: string;
    }) => client.performance.saveDraft(data),
    onSuccess: () => {
      // Silently save - don't show toast for auto-save
    },
    onError: (error) => {
      console.error("Auto-save failed:", error);
    },
  });

  // Transition review mutation
  const transitionMutation = useMutation({
    mutationFn: (data: {
      reviewId: string;
      status:
        | "DUE"
        | "SENT_TO_MANAGER"
        | "SELF_REVIEW"
        | "AWAITING_MANAGER_REVIEW"
        | "SUBMITTED"
        | "HR_REVIEWED"
        | "COMPLETED"
        | "OVERDUE";
      payload?: {
        probationConfirmationDecision?:
          | "CONFIRM_EMPLOYMENT"
          | "EXTEND_PROBATION"
          | "RECOMMEND_TERMINATION";
        comment?: string;
      };
    }) => client.performance.transitionReview(data),
    onSuccess: async () => {
      toast.success("Review status updated");
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update review status");
    },
  });

  // Submit review mutation
  const submitMutation = useMutation({
    mutationFn: (data: { reviewId: string }) =>
      client.performance.submitReview(data),
    onSuccess: async () => {
      toast.success("Review submitted successfully");
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  // Update review mutation
  const updateMutation = useMutation({
    mutationFn: (data: {
      reviewId: string;
      status?:
        | "DUE"
        | "SENT_TO_MANAGER"
        | "SELF_REVIEW"
        | "AWAITING_MANAGER_REVIEW"
        | "SUBMITTED"
        | "HR_REVIEWED"
        | "COMPLETED"
        | "OVERDUE";
      managerComment?: string;
      selfComment?: string;
      overallRating?: number;
      feedback?: Record<string, unknown>;
    }) => client.performance.updateReview(data),
    onSuccess: () => {
      toast.success("Review updated successfully");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update review");
    },
  });

  // Initialize form with defaults or existing data - no explicit type arg, let TypeScript infer
  const form = useForm({
    defaultValues: defaultFormValues,
    onSubmit: async ({ value }) => {
      if (!reviewId) {
        toast.error("No review ID provided");
        return;
      }

      if (!permissions.canSubmit) {
        toast.error("You cannot submit this review");
        return;
      }

      // First save the current draft
      const draftPayload = buildDraftPayload(value);

      if (
        permissions.canSaveDraft &&
        (draftPayload.competencyRatings.length > 0 ||
          draftPayload.managerComment ||
          draftPayload.selfComment)
      ) {
        await saveDraftMutation.mutateAsync({
          reviewId,
          ...draftPayload,
        });
      }

      // Then transition or submit the review
      // For probation, if we have a decision, we should use transition
      if (
        review?.reviewType === "PROBATION" &&
        permissions.canEditProbationDecision &&
        value.probationConfirmationDecision
      ) {
        await transitionMutation.mutateAsync({
          reviewId,
          status: "SUBMITTED",
          payload: {
            probationConfirmationDecision: value.probationConfirmationDecision,
            comment: permissions.canEditManagerComment
              ? value.managerComment
              : undefined,
          },
        });
      } else {
        await submitMutation.mutateAsync({ reviewId });
      }
    },
  });

  // Update form when review data loads
  useEffect(() => {
    if (review) {
      form.setFieldValue("managerComment", review.managerComment || "");
      form.setFieldValue("selfComment", review.selfComment || "");
      form.setFieldValue(
        "probationConfirmationDecision",
        (review.probationConfirmationDecision as
          | "CONFIRM_EMPLOYMENT"
          | "EXTEND_PROBATION"
          | "RECOMMEND_TERMINATION") || undefined,
      );

      if (review.competencies) {
        form.setFieldValue(
          "competencyRatings",
          review.competencies.map((c) => ({
            competencyId: c.id,
            rating: c.rating ?? undefined,
            justification: c.justification || "",
          })),
        );
      }
    }
  }, [review, form.setFieldValue]);

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!(reviewId && autoSaveEnabled)) {
      return;
    }

    if (!permissions.canSaveDraft) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    autoSaveTimeoutRef.current = setTimeout(() => {
      const values = form.state.values;
      const draftPayload = buildDraftPayload(values);

      if (
        draftPayload.competencyRatings.length === 0 &&
        !draftPayload.managerComment &&
        !draftPayload.selfComment
      ) {
        return;
      }

      saveDraftMutation.mutate({
        reviewId,
        ...draftPayload,
      });
    }, 2000);
  }, [
    autoSaveEnabled,
    buildDraftPayload,
    form.state.values,
    permissions.canSaveDraft,
    reviewId,
    saveDraftMutation,
  ]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    form.reset();
    onCancel?.();
  }, [form, onCancel]);

  // Save draft manually
  const handleSaveDraft = useCallback(async () => {
    if (!(reviewId && permissions.canSaveDraft)) {
      return;
    }

    const values = form.state.values;
    const draftPayload = buildDraftPayload(values);

    if (
      draftPayload.competencyRatings.length === 0 &&
      !draftPayload.managerComment &&
      !draftPayload.selfComment
    ) {
      return;
    }

    await saveDraftMutation.mutateAsync({
      reviewId,
      ...draftPayload,
    });

    toast.success("Draft saved");
  }, [
    buildDraftPayload,
    form.state.values,
    permissions.canSaveDraft,
    reviewId,
    saveDraftMutation,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    form,
    review,
    permissions,
    isLoading: isLoadingReview,
    isPending:
      saveDraftMutation.isPending ||
      submitMutation.isPending ||
      updateMutation.isPending,
    isSaving: saveDraftMutation.isPending,
    handleCancel,
    handleSaveDraft,
    triggerAutoSave,
  };
}
