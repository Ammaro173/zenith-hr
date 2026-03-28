"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePerformanceReviewFormContext } from "@/features/performance/performance-review-form-context";
import { clampInt } from "@/lib/utils";
import { client, orpc } from "@/utils";

interface AnnualReview {
  feedback?: unknown;
  id: string;
}

interface GoalAssessment {
  achievedPercentage: number;
  comment: string;
}

export function GoalAchievementSection({
  annualReview,
  objectiveReviewId,
}: {
  annualReview: AnnualReview;
  objectiveReviewId: string;
}) {
  const queryClient = useQueryClient();
  const { goalAchievementsRef, setLiveGoalCompletion, formReadOnly } =
    usePerformanceReviewFormContext() ?? {};
  const readOnly = !!formReadOnly;

  const { data: objectiveReview, isLoading } = useQuery(
    orpc.performance.getReview.queryOptions({
      input: { reviewId: objectiveReviewId },
    }),
  );

  const existingAssessments = useMemo(() => {
    const feedback =
      annualReview.feedback && typeof annualReview.feedback === "object"
        ? (annualReview.feedback as Record<string, unknown>)
        : {};
    const raw = feedback.goalAchievements;
    if (!raw || typeof raw !== "object") {
      return {};
    }
    return raw as Record<string, GoalAssessment>;
  }, [annualReview.feedback]);

  const [draft, setDraft] =
    useState<Record<string, GoalAssessment>>(existingAssessments);

  const goals = objectiveReview?.goals ?? [];

  // Sync draft to form context ref so Submit Review can read current values
  useEffect(() => {
    if (goalAchievementsRef) {
      goalAchievementsRef.current = draft;
    }
  }, [draft, goalAchievementsRef]);

  // Report live completion (sum of goal weight * achieved% / 100) so bottom bar updates as user types
  useEffect(() => {
    if (!setLiveGoalCompletion) {
      return;
    }
    if (goals.length === 0) {
      setLiveGoalCompletion(null);
      return;
    }
    let sum = 0;
    for (const g of goals) {
      const weight = typeof g.weight === "number" ? g.weight : 0;
      const achieved = draft[g.id]?.achievedPercentage ?? 0;
      sum += (weight * achieved) / 100;
    }
    setLiveGoalCompletion(Math.round(sum));
  }, [draft, goals, setLiveGoalCompletion]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentFeedback =
        annualReview.feedback && typeof annualReview.feedback === "object"
          ? (annualReview.feedback as Record<string, unknown>)
          : {};
      return await client.performance.updateReview({
        reviewId: annualReview.id,
        feedback: {
          ...currentFeedback,
          goalAchievements: draft,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved goal achievements");
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save goal achievements");
    },
  });

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Goal achievement</CardTitle>
              <CardDescription>
                Add HOD comments and achieved percentage for each objective
                goal.
              </CardDescription>
            </div>
            {!readOnly && (
              <Button
                disabled={saveMutation.isPending || isLoading}
                onClick={() => saveMutation.mutate()}
                type="button"
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              Loading objectives…
            </div>
          )}
          {!isLoading && goals.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No objective goals found.
            </div>
          )}
          {!isLoading && goals.length > 0 && (
            <div className="space-y-6">
              {goals.map((g, idx) => {
                const v = draft[g.id] ?? {
                  achievedPercentage: 0,
                  comment: "",
                };
                return (
                  <div className="rounded-lg border p-4" key={g.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                            {idx + 1}
                          </span>
                          <div className="font-medium">{g.title}</div>
                          {typeof g.weight === "number" && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                              {g.weight}%
                            </span>
                          )}
                        </div>
                        {g.description && (
                          <div className="text-muted-foreground text-sm">
                            {g.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Achieved %</Label>
                        <Input
                          disabled={readOnly}
                          inputMode="numeric"
                          onChange={(e) => {
                            const next = clampInt(
                              Number.parseInt(e.target.value || "0", 10),
                              0,
                              100,
                            );
                            setDraft((prev) => ({
                              ...prev,
                              [g.id]: { ...v, achievedPercentage: next },
                            }));
                          }}
                          readOnly={readOnly}
                          value={v.achievedPercentage}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>HOD comment</Label>
                        <Textarea
                          disabled={readOnly}
                          onChange={(e) => {
                            const next = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              [g.id]: { ...v, comment: next },
                            }));
                          }}
                          placeholder="Notes, outcomes, and evidence…"
                          readOnly={readOnly}
                          value={v.comment}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
