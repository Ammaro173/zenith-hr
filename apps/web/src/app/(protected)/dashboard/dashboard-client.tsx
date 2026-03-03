"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { Show } from "@/utils/Show";
import { DashboardShell } from "./_components/dashboard-shell";
import { CEOView } from "./_components/RoleViews/ceo-view";
import { FinanceView } from "./_components/RoleViews/finance-view";
import { HRView } from "./_components/RoleViews/hr-view";
import { ManagerView } from "./_components/RoleViews/manager-view";
import { RequesterView } from "./_components/RoleViews/requester-view";

// Shared interface for props
export interface DashboardStats {
  activeContracts: number;
  approvedRequests: number;
  averageTimeToHire: number;
  companyHeadcount?: number;
  hiringRequests: number;
  myActivePerformanceReviews?: number;
  myActiveTrips?: number;
  myPendingSeparations?: number;
  pendingRequests: number;
  teamPendingPerformanceReviews?: number;
  totalCandidates: number;
  totalDepartmentExpenses?: number;
  totalRequests: number;
}

// View Strategy Map for better extensibility (Open/Closed Principle)
const ROLE_VIEWS: Record<
  string,
  React.ComponentType<{ stats: DashboardStats }>
> = {
  EMPLOYEE: RequesterView,
  MANAGER: ManagerView,
  HOD_HR: HRView,
  HOD_FINANCE: FinanceView,
  CEO: CEOView,
};

interface DashboardClientProps {
  canCreateRequest: boolean;
  role: string;
}

export function DashboardClient({
  role,
  canCreateRequest,
}: DashboardClientProps) {
  const { data: stats, isLoading: isStatsLoading } = useQuery(
    orpc.dashboard.getStats.queryOptions(),
  );

  const isLoading = isStatsLoading && !stats;

  return (
    <DashboardShell canCreateRequest={canCreateRequest}>
      <Show>
        <Show.When isTrue={isLoading}>
          <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Show.When>
        <Show.When isTrue={!stats}>{null}</Show.When>
        <Show.Else
          render={() => {
            const ViewComponent = ROLE_VIEWS[role] || RequesterView;
            return <ViewComponent stats={stats as DashboardStats} />;
          }}
        />
      </Show>
    </DashboardShell>
  );
}
