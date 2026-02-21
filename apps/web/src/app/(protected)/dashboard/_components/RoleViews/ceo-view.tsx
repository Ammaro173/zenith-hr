"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building, Clock, Users } from "lucide-react";
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
  companyHeadcount?: number;
  totalDepartmentExpenses?: number;
}

export function CEOView({ stats }: { stats: DashboardStats }) {
  const { data: actions } = useQuery(
    orpc.dashboard.getActionsRequired.queryOptions(),
  );

  return (
    <div className="fade-in slide-in-from-bottom-4 animate-in space-y-8 duration-500">
      <ActionRequiredSection actions={actions || []} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          description="Active Employees"
          icon={Building}
          title="Company Headcount"
          value={stats?.companyHeadcount || 0}
          variant="highlight"
        />
        <StatsCard
          description="Approved Business Trips"
          icon={Briefcase}
          title="Total Expenses"
          value={`$${stats?.totalDepartmentExpenses?.toLocaleString() || 0}`}
        />
        <StatsCard
          description="Company-wide Average"
          icon={Clock}
          title="Avg Time to Hire"
          value={`${stats?.averageTimeToHire || 0}d`}
        />
        <StatsCard
          description="In Pipeline"
          icon={Users}
          title="Total Candidates"
          value={stats?.totalCandidates || 0}
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
