"use client";

import { createContext, useContext } from "react";
import type { PerformanceReviewFormType } from "./types";

interface PerformanceReviewFormContextValue {
  form: PerformanceReviewFormType;
  isEditing: boolean;
  reviewId?: string;
}

const PerformanceReviewFormContext =
  createContext<PerformanceReviewFormContextValue | null>(null);

interface PerformanceReviewFormProviderProps {
  children: React.ReactNode;
  form: PerformanceReviewFormType;
  isEditing?: boolean;
  reviewId?: string;
}

export function PerformanceReviewFormProvider({
  form,
  reviewId,
  isEditing = false,
  children,
}: PerformanceReviewFormProviderProps) {
  return (
    <PerformanceReviewFormContext.Provider
      value={{ form, reviewId, isEditing }}
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
