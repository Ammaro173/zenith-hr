import type * as React from "react";
import { Suspense } from "react";

export default function RequestsLayout({
  children,
  sheet,
}: {
  children: React.ReactNode;
  sheet: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Suspense fallback={null}>{sheet}</Suspense>
    </>
  );
}
