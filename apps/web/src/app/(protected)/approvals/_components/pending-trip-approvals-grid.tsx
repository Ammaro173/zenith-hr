"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { FunnelX, MoreHorizontal, Settings2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import { Filters } from "@/components/ui/filters";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { BusinessTrip } from "@/types/business-trips";
import { STATUS_OPTIONS, STATUS_VARIANTS } from "@/types/business-trips";
import { orpc } from "@/utils/orpc";
import { ApprovalActionDialog } from "./approval-action-dialog";

type TripApprovalAction = "APPROVE" | "REJECT";

const columnHelper = createColumnHelper<BusinessTrip>();

const filterFields: FilterFieldConfig[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "Filter by status...",
    options: STATUS_OPTIONS,
    searchable: true,
    className: "w-[180px]",
  },
];

export function PendingTripApprovalsGrid() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useQuery(
    orpc.businessTrips.getPendingApprovals.queryOptions(),
  );

  const trips = (data ?? []) as BusinessTrip[];

  const [globalFilter, setGlobalFilter] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTripId, setDialogTripId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<TripApprovalAction | null>(
    null,
  );
  const [comment, setComment] = useState("");

  const statusFilter = useMemo(() => {
    const entry = filters.find((f) => f.field === "status");
    return (entry?.values ?? []) as string[];
  }, [filters]);

  const filteredTrips = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    return trips.filter((t) => {
      if (statusFilter.length > 0 && !statusFilter.includes(t.status)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        t.destination.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q)
      );
    });
  }, [trips, globalFilter, statusFilter]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { mutateAsync: transitionTrip, isPending: isTransitionPending } =
    useMutation(
      orpc.businessTrips.transition.mutationOptions({
        onSuccess: () => {
          toast.success("Trip updated");
          queryClient.invalidateQueries({
            queryKey: orpc.businessTrips.getPendingApprovals.key(),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.dashboard.getActionsRequired.key(),
          });
        },
        onError: (error) => {
          toast.error(error.message || "Action failed");
        },
      }),
    );

  const approve = useCallback(
    async (tripId: string) => {
      await transitionTrip({ tripId, action: "APPROVE" });
    },
    [transitionTrip],
  );

  const openDialog = useCallback(
    (tripId: string, action: TripApprovalAction) => {
      setDialogTripId(tripId);
      setDialogAction(action);
      setComment("");
      setDialogOpen(true);
    },
    [],
  );

  const confirmDialogAction = useCallback(async () => {
    if (!(dialogTripId && dialogAction)) {
      return;
    }
    await transitionTrip({
      tripId: dialogTripId,
      action: dialogAction,
      comment: comment.trim() || undefined,
    });
    setDialogOpen(false);
  }, [comment, dialogAction, dialogTripId, transitionTrip]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("destination", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Destination" />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium text-black dark:text-white">
            {getValue()}
          </span>
        ),
        size: 220,
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("purpose", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Purpose" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{getValue()}</span>
        ),
        size: 280,
        enableSorting: false,
      }),
      columnHelper.accessor("startDate", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Start" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground text-xs">
            {format(new Date(getValue()), "dd MMM yyyy")}
          </span>
        ),
        size: 140,
        enableSorting: false,
      }),
      columnHelper.accessor("endDate", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="End" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground text-xs">
            {format(new Date(getValue()), "dd MMM yyyy")}
          </span>
        ),
        size: 140,
        enableSorting: false,
      }),
      columnHelper.accessor("status", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Status" />
        ),
        cell: ({ getValue }) => {
          const statusKey = getValue();
          const status = STATUS_VARIANTS[statusKey] || {
            variant: "secondary" as const,
            label: statusKey,
          };
          return (
            <Badge
              appearance="light"
              className="font-semibold shadow-none"
              variant={status.variant}
            >
              {status.label}
            </Badge>
          );
        },
        size: 160,
        enableSorting: false,
      }),
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Created" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground text-xs">
            {format(new Date(getValue()), "dd MMM yyyy")}
          </span>
        ),
        size: 140,
        enableSorting: false,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const trip = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-8 w-8 p-0" variant="ghost">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    className="cursor-pointer"
                    href={`/business-trips/${trip.id}` as Route}
                  >
                    View details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => approve(trip.id)}
                >
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => openDialog(trip.id, "REJECT")}
                >
                  Reject…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 80,
        enableHiding: false,
      }),
    ];
  }, [approve, openDialog]);

  const table = useReactTable({
    columns,
    data: filteredTrips,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleFiltersChange = useCallback((newFilters: Filter[]) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  if (isLoading) {
    return <TripsTableSkeleton />;
  }

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="font-medium">No pending trip approvals.</div>
          <div className="text-muted-foreground text-sm">
            You’re all caught up.
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/business-trips">Open trips</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (filteredTrips.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="font-medium">No results.</div>
          <div className="text-muted-foreground text-sm">
            Try adjusting search or filters.
          </div>
          <Button onClick={handleClearFilters} size="sm" variant="outline">
            Clear filters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ApprovalActionDialog
        comment={comment}
        confirmLabel={dialogAction === "REJECT" ? "Reject" : "Confirm"}
        confirmVariant={dialogAction === "REJECT" ? "destructive" : "default"}
        description="This will notify the requester and update the trip status."
        isPending={isTransitionPending}
        onCommentChange={setComment}
        onConfirm={confirmDialogAction}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        requireComment={false}
        title={dialogAction === "REJECT" ? "Reject trip" : "Update trip"}
      />

      <DataGrid
        isLoading={isFetching}
        recordCount={filteredTrips.length}
        table={table}
        tableLayout={{
          cellBorder: true,
          rowBorder: true,
          rowRounded: true,
          stripped: true,
          headerBorder: true,
          headerSticky: true,
          width: "fixed",
          columnsResizable: true,
          columnsPinnable: false,
          columnsVisibility: true,
        }}
      >
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              aria-label="Search pending trips"
              className="h-9 w-full sm:max-w-xs"
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              placeholder="Search approvals..."
              type="text"
              value={globalFilter}
            />
            <div className="flex items-center gap-2">
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button size="sm" variant="outline">
                    <Settings2 className="mr-2 h-4 w-4" />
                    View
                  </Button>
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filters
              fields={filterFields}
              filters={filters}
              onChange={handleFiltersChange}
              variant="outline"
            />
            {filters.length > 0 && (
              <Button onClick={handleClearFilters} size="sm" variant="ghost">
                <FunnelX className="me-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>

          <DataGridContainer>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DataGridContainer>

          <DataGridPagination />
        </div>
      </DataGrid>
    </>
  );
}

function TripsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-100 w-full" />
    </div>
  );
}
