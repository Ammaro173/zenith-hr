"use client";

import { createContext, useContext } from "react";
import type {
  PerformanceReviewFormType,
  PerformanceReviewPermissions,
} from "./types";

export type GoalAchievementsMap = Record<
  string,
  { achievedPercentage: number; comment?: string }
>;

interface PerformanceReviewFormContextValue {
  form: PerformanceReviewFormType;
  /** When true (e.g. review status SUBMITTED), all fields are disabled */
  formReadOnly?: boolean;
  /** Ref updated by GoalAchievementSection so submit can read current draft */
  goalAchievementsRef?: React.MutableRefObject<GoalAchievementsMap>;
  isEditing: boolean;
  permissions: PerformanceReviewPermissions;
  reviewId?: string;
  /** Called by GoalAchievementSection so completion % updates live as user types */
  setLiveGoalCompletion?: (value: number | null) => void;
}

const PerformanceReviewFormContext =
  createContext<PerformanceReviewFormContextValue | null>(null);

interface PerformanceReviewFormProviderProps {
  children: React.ReactNode;
  form: PerformanceReviewFormType;
  formReadOnly?: boolean;
  goalAchievementsRef?: React.MutableRefObject<GoalAchievementsMap>;
  isEditing?: boolean;
  permissions: PerformanceReviewPermissions;
  reviewId?: string;
  setLiveGoalCompletion?: (value: number | null) => void;
}

export function PerformanceReviewFormProvider({
  form,
  permissions,
  reviewId,
  goalAchievementsRef,
  setLiveGoalCompletion,
  formReadOnly = false,
  isEditing = false,
  children,
}: PerformanceReviewFormProviderProps) {
  return (
    <PerformanceReviewFormContext.Provider
      value={{
        form,
        isEditing,
        permissions,
        reviewId,
        goalAchievementsRef,
        setLiveGoalCompletion,
        formReadOnly,
      }}
    >
      {children}
    </PerformanceReviewFormContext.Provider>
  );
}

export function usePerformanceReviewFormContext() {
  const context = useContext(PerformanceReviewFormContext);
  if (!context) {
    throw new Error(
      "usePerformanceReviewFormContext must be used within PerformanceReviewFormProvider",
    );
  }
  return context;
}
