"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, Clock, Users } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { ActionRequiredSection } from "../action-required-section";
import { RequestsPieChart } from "../requests-pie-chart";
import { StatsCard } from "../stats-card";

interface DashboardStats {
  activeContracts: number;
  approvedRequests: number;
  averageTimeToHire: number;
  hiringRequests: number;
  pendingRequests: number;
  totalCandidates: number;
  totalRequests: number;
}

export function HRView({ stats }: { stats: DashboardStats }) {
  const { data: actions } = useQuery(
    orpc.dashboard.getActionsRequired.queryOptions(),
  );

  return (
    <div className="space-y-8">
      <ActionRequiredSection actions={actions || []} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          description="Approved vacancies"
          icon={Briefcase}
          title="Open Positions"
          value={stats?.approvedRequests || 0}
        />
        <StatsCard
          description="In pipeline"
          icon={Users}
          title="Active Candidates"
          value={stats?.totalCandidates || 0}
        />
        <StatsCard
          description="Requests waiting"
          icon={Clock}
          title="Pending HR Review"
          value={stats?.pendingRequests || 0}
          variant="highlight"
        />
        <StatsCard
          description="Performance metric"
          icon={Clock}
          title="Avg Time to Hire"
          value={`${stats?.averageTimeToHire || 0}d`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RequestsPieChart
          approved={stats?.approvedRequests || 0}
          hiring={stats?.hiringRequests || 0}
          pending={stats?.pendingRequests || 0}
        />
        {/* Further charts or tables can go here */}
      </div>
    </div>
  );
}
