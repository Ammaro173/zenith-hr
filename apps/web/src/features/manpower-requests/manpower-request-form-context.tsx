"use client";

import { createContext, useContext } from "react";
import type { ManpowerRequestFormType } from "./types";

interface ManpowerRequestFormContextValue {
  form: ManpowerRequestFormType;
}

const ManpowerRequestFormContext =
  createContext<ManpowerRequestFormContextValue | null>(null);

export function ManpowerRequestFormProvider({
  form,
  children,
}: {
  form: ManpowerRequestFormType;
  children: React.ReactNode;
}) {
  return (
    <ManpowerRequestFormContext.Provider value={{ form }}>
      {children}
    </ManpowerRequestFormContext.Provider>
  );
}

export function useManpowerRequestFormContext() {
  const context = useContext(ManpowerRequestFormContext);
  if (!context) {
    throw new Error(
      "useManpowerRequestFormContext must be used within ManpowerRequestFormProvider",
    );
  }
  return context;
}
