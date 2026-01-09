"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Admin = {
  role: string | null;
  [key: string]: unknown;
};

type CurrentAdminContextValue = {
  initialAdmin: Admin | null;
  setRole: (role: Admin["role"]) => void;
};

const CurrentAdminContext = createContext<CurrentAdminContextValue | null>(
  null,
);

export function CurrentAdminProvider({
  children,
  initialAdmin,
}: {
  children: React.ReactNode;
  initialAdmin: Admin | null;
}) {
  const [admin, setAdmin] = useState<Admin | null>(initialAdmin);

  const value = useMemo(
    () => ({
      initialAdmin: admin,
      setRole: (role: Admin["role"]) => {
        if (admin) {
          setAdmin({ ...admin, role });
        }
      },
    }),
    [admin],
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
