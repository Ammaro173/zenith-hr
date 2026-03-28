"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function PerformanceDashboardPage() {
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery(
    orpc.performance.getHrDashboard.queryOptions(),
  );

  const { data: reviews, isLoading: isLoadingReviews } = useQuery(
    orpc.performance.getReviews.queryOptions({
      input: {
        status: [
          "DUE",
          "OVERDUE",
          "SENT_TO_MANAGER",
          "AWAITING_MANAGER_REVIEW",
        ],
        pageSize: 10,
      },
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          System Performance Dashboard
        </h1>
        <p className="text-muted-foreground">
          Operational overview of all active and pending reviews across the
          organization.
        </p>
      </div>

      {/* Metric Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Active Probations
            </CardTitle>
            <Clock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoadingMetrics ? "..." : metrics?.probationDue}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Annual Reviews Due
            </CardTitle>
            <Users className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoadingMetrics ? "..." : metrics?.annualDue}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total Overdue</CardTitle>
            <AlertCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">
              {isLoadingMetrics ? "..." : metrics?.overdue}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Completed</CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoadingMetrics ? "..." : metrics?.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attention Required</CardTitle>
          <CardDescription>
            Reviews that are due or overdue and require manager/HR action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingReviews && (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={5}>
                    Loading review data...
                  </TableCell>
                </TableRow>
              )}

              {!isLoadingReviews && reviews?.data.length === 0 && (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No critical reviews found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoadingReviews &&
                reviews?.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.employee?.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.employee?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.reviewType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          r.status === "OVERDUE" && "bg-red-100 text-red-800",
                          r.status === "DUE" && "bg-yellow-100 text-yellow-800",
                        )}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${r.completionPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs">
                          {r.completionPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/performance/reviews/${r.id}`}>
                          <ExternalLink className="mr-2 size-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
