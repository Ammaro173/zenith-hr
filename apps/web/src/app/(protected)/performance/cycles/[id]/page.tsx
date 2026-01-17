"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils";

export default function PerformanceCyclePage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const role = getRoleFromSessionUser(session?.user);
  const canCreateReview =
    role === "HR" || role === "ADMIN" || role === "MANAGER";

  // Only run query when actually on the cycles/[id] path (not reviews)
  const isCyclePage =
    pathname.includes("/cycles/") && !pathname.includes("/reviews/");

  const { data: cycle, isLoading } = useQuery(
    orpc.performance.getCycle.queryOptions({
      input: { id: params.id },
      enabled: isCyclePage,
    }),
  );

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-4">
        <h2 className="font-semibold text-2xl">Cycle Not Found</h2>
        <p className="text-muted-foreground">
          The performance cycle you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  const hasReviews = (cycle.reviews?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">{cycle.name}</h1>
          <p className="text-muted-foreground">
            {format(new Date(cycle.startDate), "MMM d, yyyy")} -{" "}
            {format(new Date(cycle.endDate), "MMM d, yyyy")}
          </p>
        </div>
        <Badge variant="outline">{cycle.status}</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <Users className="size-4 text-muted-foreground" />
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {cycle.reviews?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {cycle.reviews?.filter((r) => r.status === "COMPLETED").length ??
                0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {cycle.reviews?.filter((r) =>
                [
                  "DRAFT",
                  "SELF_REVIEW",
                  "MANAGER_REVIEW",
                  "IN_REVIEW",
                ].includes(r.status),
              ).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reviews</CardTitle>
            <CardDescription>
              Employee reviews in this performance cycle.
            </CardDescription>
          </div>
          {canCreateReview && (
            <Button asChild size="sm">
              <Link
                href={`/performance/cycles/${params.id}/reviews/new` as Route}
              >
                <Plus className="mr-2 size-4" />
                Add Review
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasReviews && (
                <TableRow>
                  <TableCell className="py-8 text-center" colSpan={6}>
                    <div className="text-muted-foreground">
                      No reviews created yet.
                      {canCreateReview && " Click 'Add Review' to create one."}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {cycle.reviews?.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage
                          alt={review.employee.name || ""}
                          src={review.employee.image || undefined}
                        />
                        <AvatarFallback className="text-xs">
                          {review.employee.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {review.employee.name || review.employee.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {review.reviewer?.name || review.reviewer?.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{review.reviewType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{review.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${review.completionPercentage ?? 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {review.completionPercentage ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <a href={`/performance/reviews/${review.id}`}>View</a>
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
