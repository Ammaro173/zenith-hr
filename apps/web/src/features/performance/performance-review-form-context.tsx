"use client";

import { createContext, useContext } from "react";
import type { PerformanceReviewFormType } from "./types";

interface PerformanceReviewFormContextValue {
  form: PerformanceReviewFormType;
  reviewId?: string;
  isEditing: boolean;
}

const PerformanceReviewFormContext =
  createContext<PerformanceReviewFormContextValue | null>(null);

interface PerformanceReviewFormProviderProps {
  form: PerformanceReviewFormType;
  reviewId?: string;
  isEditing?: boolean;
  children: React.ReactNode;
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
