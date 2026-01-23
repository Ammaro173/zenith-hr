"use client";

import { DashboardHeader } from "./dashboard-header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fade-in container mx-auto max-w-7xl animate-in space-y-8 p-8 pb-16">
      <DashboardHeader />
      {children}
    </div>
  );
}
