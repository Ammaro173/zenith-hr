import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";
import type { ReviewFormValues } from "./types";

// Default values for the form
const defaultFormValues: ReviewFormValues = {
  status: undefined,
  managerComment: "",
  selfComment: "",
  competencyRatings: [],
};

interface UsePerformanceReviewFormProps {
  reviewId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  autoSaveEnabled?: boolean;
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

  // Submit review mutation
  const submitMutation = useMutation({
    mutationFn: (data: { reviewId: string }) =>
      client.performance.submitReview(data),
    onSuccess: () => {
      toast.success("Review submitted successfully");
      queryClient.invalidateQueries();
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
        | "DRAFT"
        | "SELF_REVIEW"
        | "MANAGER_REVIEW"
        | "IN_REVIEW"
        | "SUBMITTED"
        | "ACKNOWLEDGED"
        | "COMPLETED";
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

      // First save the current draft
      const competencyRatingsToSave = value.competencyRatings
        .filter((c) => c.rating !== undefined)
        .map((c) => ({
          competencyId: c.competencyId,
          rating: c.rating as number,
          justification: c.justification || undefined,
        }));

      if (competencyRatingsToSave.length > 0 || value.managerComment) {
        await saveDraftMutation.mutateAsync({
          reviewId,
          competencyRatings: competencyRatingsToSave,
          managerComment: value.managerComment || undefined,
          selfComment: value.selfComment || undefined,
        });
      }

      // Then submit the review
      await submitMutation.mutateAsync({ reviewId });
    },
  });

  // Update form when review data loads
  useEffect(() => {
    if (review) {
      form.setFieldValue("managerComment", review.managerComment || "");
      form.setFieldValue("selfComment", review.selfComment || "");

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

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    autoSaveTimeoutRef.current = setTimeout(() => {
      const values = form.state.values;
      const competencyRatingsToSave = values.competencyRatings
        .filter((c) => c.rating !== undefined)
        .map((c) => ({
          competencyId: c.competencyId,
          rating: c.rating as number,
          justification: c.justification || undefined,
        }));

      saveDraftMutation.mutate({
        reviewId,
        competencyRatings: competencyRatingsToSave,
        managerComment: values.managerComment || undefined,
        selfComment: values.selfComment || undefined,
      });
    }, 2000);
  }, [reviewId, autoSaveEnabled, form.state.values, saveDraftMutation]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    form.reset();
    onCancel?.();
  }, [form, onCancel]);

  // Save draft manually
  const handleSaveDraft = useCallback(async () => {
    if (!reviewId) {
      return;
    }

    const values = form.state.values;
    const competencyRatingsToSave = values.competencyRatings
      .filter((c) => c.rating !== undefined)
      .map((c) => ({
        competencyId: c.competencyId,
        rating: c.rating as number,
        justification: c.justification || undefined,
      }));

    await saveDraftMutation.mutateAsync({
      reviewId,
      competencyRatings: competencyRatingsToSave,
      managerComment: values.managerComment || undefined,
      selfComment: values.selfComment || undefined,
    });

    toast.success("Draft saved");
  }, [reviewId, form.state.values, saveDraftMutation]);

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
