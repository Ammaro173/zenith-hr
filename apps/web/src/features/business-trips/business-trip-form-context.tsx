"use client";

import { createContext, useContext } from "react";
import type { BusinessTripFormType } from "./use-business-trip-form";

interface BusinessTripFormContextValue {
  form: BusinessTripFormType;
}

const BusinessTripFormContext =
  createContext<BusinessTripFormContextValue | null>(null);

export function useBusinessTripFormContext() {
  const context = useContext(BusinessTripFormContext);
  if (!context) {
    throw new Error(
      "useBusinessTripFormContext must be used within a BusinessTripFormProvider",
    );
  }
  return context;
}

export function BusinessTripFormProvider({
  form,
  children,
}: {
  form: BusinessTripFormType;
  children: React.ReactNode;
}) {
  return (
    <BusinessTripFormContext.Provider value={{ form }}>
      {children}
    </BusinessTripFormContext.Provider>
  );
}
