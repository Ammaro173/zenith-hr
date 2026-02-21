"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, Clock, FileText, Users } from "lucide-react";
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
  totalDepartmentExpenses?: number;
}

export function FinanceView({ stats }: { stats: DashboardStats }) {
  const { data: actions } = useQuery(
    orpc.dashboard.getActionsRequired.queryOptions(),
  );

  return (
    <div className="fade-in slide-in-from-bottom-4 animate-in space-y-8 duration-500">
      <ActionRequiredSection actions={actions || []} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          description="Approved & Completed Trips"
          icon={CircleDollarSign}
          title="Total Expenses"
          value={`$${stats?.totalDepartmentExpenses?.toLocaleString() || 0}`}
          variant="highlight"
        />
        <StatsCard
          description="Awaiting Finance Review"
          icon={Clock}
          title="Pending Approvals"
          value={stats?.pendingRequests || 0}
          variant="highlight"
        />
        <StatsCard
          description="Currently Signed"
          icon={FileText}
          title="Active Contracts"
          value={stats?.activeContracts || 0}
        />
        <StatsCard
          description="Budget Allocated"
          icon={Users}
          title="Open Roles"
          value={stats?.approvedRequests || 0}
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
