"use client";

import { DashboardHeader } from "./dashboard-header";

export function DashboardShell({
  children,
  canCreateRequest,
}: {
  children: React.ReactNode;
  canCreateRequest: boolean;
}) {
  return (
    <div className="fade-in container mx-auto max-w-7xl animate-in space-y-8 p-8 pb-16">
      <DashboardHeader canCreateRequest={canCreateRequest} />
      {children}
    </div>
  );
}
