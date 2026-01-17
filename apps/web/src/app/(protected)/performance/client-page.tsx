"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
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
import { CycleRowActions } from "@/features/performance/components/cycle-row-actions";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils";

interface PerformanceClientPageProps {
  canCreateCycle: boolean;
}

export function PerformanceClientPage({
  canCreateCycle,
}: PerformanceClientPageProps) {
  const { data: cycles, isLoading } = useQuery(
    orpc.performance.getCycles.queryOptions(),
  );

  const hasCycles = (cycles?.length ?? 0) > 0;

  // Calculate stats from cycles data
  const activeCycles = cycles?.filter((c) => c.status === "ACTIVE").length ?? 0;
  const completedCycles =
    cycles?.filter((c) => c.status === "COMPLETED").length ?? 0;
  const totalCycles = cycles?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Performance Management
          </h1>
          <p className="text-muted-foreground">
            Manage reviews, goals, and performance cycles.
          </p>
        </div>
        {canCreateCycle && (
          <Button asChild>
            <Link href={"/performance/cycles/new" as Route}>
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Active Cycles</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{activeCycles}</div>
            <p className="text-muted-foreground text-xs">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total Cycles</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalCycles}</div>
            <p className="text-muted-foreground text-xs">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{completedCycles}</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${totalCycles > 0 ? (completedCycles / totalCycles) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cycles Table */}
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
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell className="py-8 text-center" colSpan={4}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Loading cycles...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!(isLoading || hasCycles) && (
                <TableRow>
                  <TableCell className="py-12 text-center" colSpan={4}>
                    <div className="flex flex-col items-center gap-3">
                      <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
                      <div className="text-muted-foreground">
                        No cycles found.
                        {canCreateCycle &&
                          " Create your first performance cycle to get started."}
                      </div>
                      {canCreateCycle && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={"/performance/cycles/new" as Route}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Cycle
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                cycles?.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell>
                      <div className="font-medium">{cycle.name}</div>
                      {cycle.description && (
                        <div className="max-w-xs truncate text-muted-foreground text-xs">
                          {cycle.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(cycle.startDate), "MMM d")} -{" "}
                        {format(new Date(cycle.endDate), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          cycle.status === "ACTIVE" &&
                            "bg-green-100 text-green-800 hover:bg-green-100",
                          cycle.status === "DRAFT" &&
                            "bg-blue-100 text-blue-800 hover:bg-blue-100",
                          cycle.status === "COMPLETED" &&
                            "bg-gray-100 text-gray-800 hover:bg-gray-100",
                          cycle.status === "ARCHIVED" &&
                            "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                        )}
                        variant="secondary"
                      >
                        {cycle.status === "ACTIVE" && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {cycle.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <CycleRowActions
                        canManage={canCreateCycle}
                        cycle={cycle}
                      />
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
