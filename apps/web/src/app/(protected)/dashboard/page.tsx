"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery(
    orpc.dashboard.getStats.queryOptions()
  );
  const { data: pending } = useQuery(
    orpc.dashboard.getPendingCount.queryOptions()
  );

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Quick overview of requests, candidates, contracts, and approvals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {stats?.totalRequests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {stats?.pendingRequests ?? 0}
            </div>
            <div className="text-muted-foreground text-xs">
              Inbox count: {pending?.count ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {stats?.approvedRequests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hiring In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {stats?.hiringRequests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {stats?.totalCandidates ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {stats?.activeContracts ?? 0}
            </div>
            <div className="text-muted-foreground text-xs">
              Avg time to hire: {stats?.averageTimeToHire ?? 0} days
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600"
          href="/requests"
        >
          Requests
        </Link>
        <Link
          className="rounded bg-green-500 px-4 py-2 text-primary hover:bg-green-600"
          href="/approvals"
        >
          Approvals
        </Link>
        <Link
          className="rounded bg-muted px-4 py-2 text-foreground hover:bg-muted/80"
          href="/business-trips"
        >
          Trips
        </Link>
        <Link
          className="rounded bg-muted px-4 py-2 text-foreground hover:bg-muted/80"
          href="/separations"
        >
          Separations
        </Link>
        <Link
          className="rounded bg-muted px-4 py-2 text-foreground hover:bg-muted/80"
          href="/performance"
        >
          Performance
        </Link>
      </div>
    </div>
  );
}
