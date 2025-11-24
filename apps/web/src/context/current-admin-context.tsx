"use client";

import { createContext, useContext, useMemo } from "react";
import type { Admin } from "@/contracts/admin/schema";

type CurrentAdminContextValue = {
  initialAdmin: Admin | null;
};

const CurrentAdminContext = createContext<CurrentAdminContextValue | null>(
  null
);

export function CurrentAdminProvider({
  children,
  initialAdmin,
}: {
  children: React.ReactNode;
  initialAdmin: Admin | null;
}) {
  const value = useMemo(
    () => ({
      initialAdmin,
    }),
    [initialAdmin]
  );

  return (
    <CurrentAdminContext.Provider value={value}>
      {children}
    </CurrentAdminContext.Provider>
  );
}

export function useCurrentAdminContext() {
  return useContext(CurrentAdminContext);
}
