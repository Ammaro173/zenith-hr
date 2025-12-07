"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import type { Route } from "next";
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
import { orpc } from "@/utils";

export default function PerformancePage() {
  const { data: cycles, isLoading } = useQuery(
    orpc.performance.getCycles.queryOptions()
  );
  const hasCycles = (cycles?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Performance Management
          </h1>
          <p className="text-muted-foreground">
            Manage reviews, goals, and performance cycles.
          </p>
        </div>
        {/* TODO: Only show for HR/Admin */}
        <Button asChild>
          <Link href={"/performance/cycles/new" as Route}>
            <Plus className="mr-2 h-4 w-4" />
            New Cycle
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Active Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">12</div>
            <p className="text-muted-foreground text-xs">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Pending Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">5</div>
            <p className="text-muted-foreground text-xs">Needs approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">85%</div>
            <p className="text-muted-foreground text-xs">For current cycle</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Cycles</CardTitle>
          <CardDescription>
            History of performance review cycles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : null}

              {isLoading || hasCycles ? null : (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    No cycles found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && hasCycles
                ? (cycles?.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">
                        {cycle.name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(cycle.startDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(cycle.endDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cycle.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            href={`/performance/cycles/${cycle.id}` as Route}
                          >
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) ?? null)
                : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
