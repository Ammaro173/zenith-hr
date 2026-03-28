import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";
import type { GoalAchievementsMap } from "./performance-review-form-context";
import type { PerformanceReviewPermissions, ReviewFormValues } from "./types";

// Default values for the form
const defaultFormValues: ReviewFormValues = {
  status: undefined,
  managerComment: "",
  probationDecisionComment: "",
  probationPerformanceRate: "",
  probationStrengthness: "",
  probationWeakness: "",
  selfComment: "",
  competencyRatings: [],
  probationConfirmationDecision: undefined,
};

const normalizeProbationDecision = (
  value: unknown,
):
  | "CONFIRM_EMPLOYMENT"
  | "EXTEND_PROBATION"
  | "RECOMMEND_TERMINATION"
  | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  const compact = normalized.replace(/[^A-Z]/g, "");
  if (normalized === "CONFIRM_EMPLOYMENT") {
    return "CONFIRM_EMPLOYMENT";
  }
  if (normalized === "EXTEND_PROBATION") {
    return "EXTEND_PROBATION";
  }
  if (normalized === "RECOMMEND_TERMINATION") {
    return "RECOMMEND_TERMINATION";
  }
  if (compact.includes("CONFIRM") && compact.includes("EMPLOY")) {
    return "CONFIRM_EMPLOYMENT";
  }
  if (compact.includes("EXTEND") && compact.includes("PROBATION")) {
    return "EXTEND_PROBATION";
  }
  if (
    compact.includes("TERMINAT") ||
    (compact.includes("RECOMMEND") && compact.includes("TERMIN"))
  ) {
    return "RECOMMEND_TERMINATION";
  }
  return undefined;
};

interface UsePerformanceReviewFormProps {
  autoSaveEnabled?: boolean;
  employeeId?: string;
  goalAchievementsRef?: React.MutableRefObject<GoalAchievementsMap>;
  onCancel?: () => void;
  onSuccess?: () => void;
  reviewId?: string;
}

export function usePerformanceReviewForm({
  reviewId,
  employeeId,
  onSuccess,
  onCancel,
  goalAchievementsRef,
  autoSaveEnabled = true,
}: UsePerformanceReviewFormProps = {}) {
  const queryClient = useQueryClient();
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [createdReviewId, setCreatedReviewId] = useState<string | null>(null);
  const effectiveReviewId = reviewId ?? createdReviewId;
  const isCreatingProbation = !effectiveReviewId && !!employeeId;

  // Fetch existing review if editing
  const { data: review, isLoading: isLoadingReview } = useQuery(
    orpc.performance.getReview.queryOptions({
      input: { reviewId: effectiveReviewId ?? "" },
      enabled: !!effectiveReviewId,
    }),
  );

  const { data: probationTemplates } = useQuery({
    ...orpc.performance.getCompetencyTemplates.queryOptions({
      input: { reviewType: "PROBATION" },
    }),
    enabled: isCreatingProbation,
  });
  const { data: allPerformanceEmployees } = useQuery({
    ...orpc.performance.getPerformanceEmployeesAll.queryOptions(),
    enabled: isCreatingProbation,
  });

  const createModePermissions: PerformanceReviewPermissions = {
    canCreateCompetencies: false,
    canDirectlyEditStatus: false,
    canEditCompetencies: true,
    canEditManagerComment: true,
    canEditOverallRating: false,
    canEditProbationDecision: true,
    canEditSelfComment: false,
    canManageGoals: true,
    canSaveDraft: true,
    canSubmit: true,
  };
  const fallbackPermissions: PerformanceReviewPermissions = {
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
  let permissions: PerformanceReviewPermissions;
  if (review?.permissions) {
    permissions = review.permissions;
  } else if (isCreatingProbation) {
    permissions = createModePermissions;
  } else {
    permissions = fallbackPermissions;
  }
  const selectedProbationEmployee = isCreatingProbation
    ? allPerformanceEmployees?.find((employee) => employee.id === employeeId)
    : undefined;

  const draftProbationReview = isCreatingProbation
    ? {
        id: "new",
        reviewType: "PROBATION" as const,
        status: "DUE" as const,
        completionPercentage: 0,
        managerComment: "",
        selfComment: "",
        probationConfirmationDecision: null,
        competencies: (probationTemplates ?? []).map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description ?? null,
          category: template.category ?? null,
          rating: null,
          justification: null,
          weight: template.weight ?? 0,
        })),
        goals: [],
        permissions: createModePermissions,
        feedback: null,
        totalScore: null,
        linkedObjectiveReviewId: null,
        reviewPeriodStart: selectedProbationEmployee?.joiningDate ?? null,
        reviewPeriodEnd: new Date(),
        employee: selectedProbationEmployee
          ? {
              id: selectedProbationEmployee.id,
              name: selectedProbationEmployee.name ?? null,
              email: selectedProbationEmployee.email,
              joiningDate: selectedProbationEmployee.joiningDate ?? null,
            }
          : null,
      }
    : null;
  const hydratedReview = review ?? draftProbationReview;

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
        feedback:
          permissions.canEditManagerComment &&
          (values.probationStrengthness.trim() ||
            values.probationWeakness.trim() ||
            values.probationPerformanceRate.trim())
            ? {
                probationPerformanceRate:
                  values.probationPerformanceRate.trim() || undefined,
                probationStrengthness:
                  values.probationStrengthness.trim() || undefined,
                probationWeakness: values.probationWeakness.trim() || undefined,
              }
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
      feedback?: Record<string, unknown>;
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

  // Submit goal review as annual (convert OBJECTIVE_SETTING → ANNUAL_PERFORMANCE)
  const submitGoalAsAnnualMutation = useMutation({
    mutationFn: (data: {
      reviewId: string;
      reflection?: string;
      goalAchievements: Record<
        string,
        { achievedPercentage: number; comment?: string }
      >;
    }) => client.performance.submitGoalReviewAsAnnual(data),
    onSuccess: async () => {
      toast.success("Goal review submitted as annual");
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit as annual review");
    },
  });

  const createProbationMutation = useMutation({
    mutationFn: (data: { employeeId: string }) =>
      client.performance.createProbationForEmployee(data),
    onError: (error) => {
      toast.error(error.message || "Failed to create probation review");
    },
  });

  const ensureReviewId = useCallback(async () => {
    if (effectiveReviewId) {
      return effectiveReviewId;
    }

    if (!employeeId) {
      return null;
    }

    const created = await createProbationMutation.mutateAsync({ employeeId });
    setCreatedReviewId(created.reviewId);
    return created.reviewId;
  }, [createProbationMutation, effectiveReviewId, employeeId]);

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
      const ensuredReviewId = await ensureReviewId();
      if (!ensuredReviewId) {
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
          draftPayload.feedback ||
          draftPayload.selfComment)
      ) {
        await saveDraftMutation.mutateAsync({
          reviewId: ensuredReviewId,
          ...draftPayload,
        });
      }

      // Then transition or submit the review
      if (
        hydratedReview?.reviewType === "PROBATION" &&
        permissions.canEditProbationDecision &&
        value.probationConfirmationDecision
      ) {
        await transitionMutation.mutateAsync({
          reviewId: ensuredReviewId,
          status: "SUBMITTED",
          payload: {
            probationConfirmationDecision: value.probationConfirmationDecision,
            comment: value.probationDecisionComment || undefined,
          },
        });
      } else if (hydratedReview?.reviewType === "OBJECTIVE_SETTING") {
        const fresh = await queryClient.fetchQuery(
          orpc.performance.getReview.queryOptions({
            input: { reviewId: ensuredReviewId },
          }),
        );
        const feedback = fresh?.feedback as
          | { goalAchievements?: GoalAchievementsMap }
          | null
          | undefined;
        // Use current draft from GoalAchievementSection (ref) so Submit saves Achieved % and HOD comments
        const goalAchievements =
          goalAchievementsRef?.current &&
          Object.keys(goalAchievementsRef.current).length > 0
            ? goalAchievementsRef.current
            : (feedback?.goalAchievements ?? {});
        await submitGoalAsAnnualMutation.mutateAsync({
          reviewId: ensuredReviewId,
          reflection: value.selfComment || fresh?.selfComment || undefined,
          goalAchievements,
        });
      } else {
        await submitMutation.mutateAsync({ reviewId: ensuredReviewId });
      }
    },
  });

  // Update form when review data loads
  useEffect(() => {
    if (hydratedReview) {
      form.setFieldValue("managerComment", hydratedReview.managerComment || "");
      form.setFieldValue(
        "probationDecisionComment",
        hydratedReview.managerComment || "",
      );
      form.setFieldValue("selfComment", hydratedReview.selfComment || "");
      const feedback =
        hydratedReview.feedback && typeof hydratedReview.feedback === "object"
          ? (hydratedReview.feedback as Record<string, unknown>)
          : {};
      form.setFieldValue(
        "probationStrengthness",
        typeof feedback.probationStrengthness === "string"
          ? feedback.probationStrengthness
          : "",
      );
      form.setFieldValue(
        "probationWeakness",
        typeof feedback.probationWeakness === "string"
          ? feedback.probationWeakness
          : "",
      );
      form.setFieldValue(
        "probationPerformanceRate",
        typeof feedback.probationPerformanceRate === "string"
          ? feedback.probationPerformanceRate
          : "",
      );
      form.setFieldValue(
        "probationConfirmationDecision",
        normalizeProbationDecision(
          hydratedReview.probationConfirmationDecision,
        ),
      );

      if (hydratedReview.competencies) {
        form.setFieldValue(
          "competencyRatings",
          hydratedReview.competencies.map((c) => ({
            competencyId: c.id,
            rating: c.rating ?? undefined,
            justification: c.justification || "",
          })),
        );
      }
    }
  }, [hydratedReview, form.setFieldValue]);

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!(effectiveReviewId && autoSaveEnabled)) {
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
        !draftPayload.feedback &&
        !draftPayload.selfComment
      ) {
        return;
      }

      saveDraftMutation.mutate({
        reviewId: effectiveReviewId,
        ...draftPayload,
      });
    }, 2000);
  }, [
    autoSaveEnabled,
    buildDraftPayload,
    effectiveReviewId,
    form.state.values,
    permissions.canSaveDraft,
    saveDraftMutation,
  ]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    form.reset();
    onCancel?.();
  }, [form, onCancel]);

  // Save draft manually
  const handleSaveDraft = useCallback(async () => {
    if (!permissions.canSaveDraft) {
      return;
    }
    const ensuredReviewId = await ensureReviewId();
    if (!ensuredReviewId) {
      return;
    }

    const values = form.state.values;
    const draftPayload = buildDraftPayload(values);

    if (
      draftPayload.competencyRatings.length === 0 &&
      !draftPayload.managerComment &&
      !draftPayload.feedback &&
      !draftPayload.selfComment
    ) {
      return;
    }

    await saveDraftMutation.mutateAsync({
      reviewId: ensuredReviewId,
      ...draftPayload,
    });

    toast.success("Draft saved");
  }, [
    buildDraftPayload,
    form.state.values,
    permissions.canSaveDraft,
    ensureReviewId,
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

  // Goal-based completion: sum of (goal weight * achieved%) / 100 for reviews with goals
  const goalBasedCompletion = useMemo(() => {
    if (!hydratedReview?.goals?.length) {
      return undefined;
    }
    const feedback = hydratedReview.feedback as
      | { goalAchievements?: GoalAchievementsMap }
      | null
      | undefined;
    const achievements = feedback?.goalAchievements ?? {};
    let sum = 0;
    for (const g of hydratedReview.goals) {
      const weight = typeof g.weight === "number" ? g.weight : 0;
      const achieved = achievements[g.id]?.achievedPercentage ?? 0;
      sum += (weight * achieved) / 100;
    }
    return Math.round(sum);
  }, [hydratedReview?.goals, hydratedReview?.feedback]);

  return {
    form,
    review: hydratedReview,
    permissions,
    isLoading: isLoadingReview,
    isPending:
      saveDraftMutation.isPending ||
      createProbationMutation.isPending ||
      submitMutation.isPending ||
      submitGoalAsAnnualMutation.isPending ||
      updateMutation.isPending,
    isSaving: saveDraftMutation.isPending,
    handleCancel,
    handleSaveDraft,
    goalBasedCompletion,
    triggerAutoSave,
  };
}
