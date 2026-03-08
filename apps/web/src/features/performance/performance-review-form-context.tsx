"use client";

import { createContext, useContext } from "react";
import type {
  PerformanceReviewFormType,
  PerformanceReviewPermissions,
} from "./types";

interface PerformanceReviewFormContextValue {
  form: PerformanceReviewFormType;
  isEditing: boolean;
  permissions: PerformanceReviewPermissions;
  reviewId?: string;
}

const PerformanceReviewFormContext =
  createContext<PerformanceReviewFormContextValue | null>(null);

interface PerformanceReviewFormProviderProps {
  children: React.ReactNode;
  form: PerformanceReviewFormType;
  isEditing?: boolean;
  permissions: PerformanceReviewPermissions;
  reviewId?: string;
}

export function PerformanceReviewFormProvider({
  form,
  permissions,
  reviewId,
  isEditing = false,
  children,
}: PerformanceReviewFormProviderProps) {
  return (
    <PerformanceReviewFormContext.Provider
      value={{ form, isEditing, permissions, reviewId }}
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
