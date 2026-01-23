"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, PlayCircle } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { ActiveRequestsTable } from "../active-requests-table";
import { StatsCard } from "../stats-card";

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  hiringRequests: number;
  totalCandidates: number;
  activeContracts: number;
  averageTimeToHire: number;
}

export function RequesterView({ stats }: { stats: DashboardStats }) {
  const { data: myRequests, isLoading } = useQuery(
    orpc.requests.getMyRequests.queryOptions({ input: { pageSize: 5 } }),
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          description="Lifetime requests"
          icon={FileText}
          title="Total Requests"
          value={stats?.totalRequests || 0}
        />
        <StatsCard
          description="Awaiting approval"
          icon={Clock}
          title="Pending"
          value={stats?.pendingRequests || 0}
          variant="highlight"
        />
        <StatsCard
          description="Ready for hire"
          icon={CheckCircle2}
          title="Approved"
          value={stats?.approvedRequests || 0}
        />
        <StatsCard
          description="Hiring underway"
          icon={PlayCircle}
          title="In Progress"
          value={stats?.hiringRequests || 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <ActiveRequestsTable
          isLoading={isLoading}
          requests={Array.isArray(myRequests) ? myRequests : []}
        />
      </div>
    </div>
  );
}
