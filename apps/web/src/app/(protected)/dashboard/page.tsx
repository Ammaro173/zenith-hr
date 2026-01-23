"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { Show } from "@/utils/Show";
import { DashboardShell } from "./_components/dashboard-shell";
import { HRView } from "./_components/RoleViews/hr-view";
import { ManagerView } from "./_components/RoleViews/manager-view";
import { RequesterView } from "./_components/RoleViews/requester-view";

// Shared interface for props
interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  hiringRequests: number;
  totalCandidates: number;
  activeContracts: number;
  averageTimeToHire: number;
}

// View Strategy Map for better extensibility (Open/Closed Principle)
const ROLE_VIEWS: Record<
  string,
  React.ComponentType<{ stats: DashboardStats }>
> = {
  REQUESTER: RequesterView,
  MANAGER: ManagerView,
  HR: HRView,
  FINANCE: ManagerView, // Fallback to ManagerView for now
  CEO: ManagerView, // Fallback to ManagerView for now
};

export default function DashboardPage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const { data: stats, isLoading: isStatsLoading } = useQuery(
    orpc.dashboard.getStats.queryOptions(),
  );

  const isLoading = isAuthPending || (isStatsLoading && !stats);

  return (
    <DashboardShell>
      <Show>
        <Show.When isTrue={isLoading}>
          <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Show.When>
        <Show.When isTrue={!(session && stats)}>{null}</Show.When>
        <Show.Else
          render={() => {
            const role = session?.user.role || "REQUESTER";
            const ViewComponent = ROLE_VIEWS[role] || RequesterView;
            return <ViewComponent stats={stats as DashboardStats} />;
          }}
        />
      </Show>
    </DashboardShell>
  );
}
