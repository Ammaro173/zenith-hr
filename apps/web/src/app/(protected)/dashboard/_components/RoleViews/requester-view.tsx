"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, PlayCircle } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { ActiveRequestsTable } from "../active-requests-table";
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
  myActiveTrips?: number;
  myPendingSeparations?: number;
  myActivePerformanceReviews?: number;
}

export function RequesterView({ stats }: { stats: DashboardStats }) {
  const { data: myRequests, isLoading } = useQuery(
    orpc.requests.getMyRequests.queryOptions({ input: { pageSize: 5 } }),
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          description="Awaiting approval"
          icon={Clock}
          title="Pending Requests"
          value={stats?.pendingRequests || 0}
          variant="highlight"
        />
        <StatsCard
          description="Business Trips"
          icon={CheckCircle2}
          title="Active Trips"
          value={stats?.myActiveTrips || 0}
        />
        <StatsCard
          description="Separation check"
          icon={PlayCircle}
          title="Pending Separations"
          value={stats?.myPendingSeparations || 0}
        />
        <StatsCard
          description="Performance check"
          icon={FileText}
          title="Active Reviews"
          value={stats?.myActivePerformanceReviews || 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <ActiveRequestsTable
          isLoading={isLoading}
          requests={Array.isArray(myRequests) ? myRequests : []}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RequestsPieChart
          approved={stats?.approvedRequests || 0}
          hiring={stats?.hiringRequests || 0}
          pending={stats?.pendingRequests || 0}
        />
      </div>
    </div>
  );
}
