"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, FileCheck, UserPlus, Users } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { ActionRequiredSection } from "../action-required-section";
import { RequestsPieChart } from "../requests-pie-chart";
import { StatsCard } from "../stats-card";

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  hiringRequests: number;
  totalCandidates: number;
  activeContracts: number;
  averageTimeToHire: number;
  teamPendingPerformanceReviews?: number;
}

export function ManagerView({ stats }: { stats: DashboardStats }) {
  const { data: actions } = useQuery(
    orpc.dashboard.getActionsRequired.queryOptions(),
  );

  return (
    <div className="space-y-8">
      {/* Action Required Section - Top Priority for Managers */}
      <ActionRequiredSection actions={actions || []} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          description="Submitted by team"
          icon={Users}
          title="My Team Requests"
          value={stats?.totalRequests || 0}
        />
        <StatsCard
          description="Requires your action"
          icon={Clock}
          title="Pending Approvals"
          value={stats?.pendingRequests || 0}
          variant="highlight"
        />
        <StatsCard
          description="Team evaluations"
          icon={FileCheck}
          title="Pending Reviews"
          value={stats?.teamPendingPerformanceReviews || 0}
        />
        <StatsCard
          description="Active recruitments"
          icon={UserPlus}
          title="Hiring in Progress"
          value={stats?.hiringRequests || 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RequestsPieChart
          approved={stats?.approvedRequests || 0}
          hiring={stats?.hiringRequests || 0}
          pending={stats?.pendingRequests || 0}
        />
      </div>
    </div>
  );
}
