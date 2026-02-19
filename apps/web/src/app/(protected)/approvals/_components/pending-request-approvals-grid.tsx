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
import type { ManpowerRequest } from "@/types/requests";
import { STATUS_OPTIONS, STATUS_VARIANTS } from "@/types/requests";
import { orpc } from "@/utils/orpc";
import { ApprovalActionDialog } from "./approval-action-dialog";

type RequestApprovalAction = "APPROVE" | "REJECT" | "REQUEST_CHANGE";

const columnHelper = createColumnHelper<ManpowerRequest>();

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

export function PendingRequestApprovalsGrid() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useQuery(
    orpc.requests.getPendingApprovals.queryOptions(),
  );

  const requests = (data ?? []) as ManpowerRequest[];

  const [globalFilter, setGlobalFilter] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<Exclude<
    RequestApprovalAction,
    "APPROVE"
  > | null>(null);
  const [dialogRequestId, setDialogRequestId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const statusFilter = useMemo(() => {
    const entry = filters.find((f) => f.field === "status");
    return (entry?.values ?? []) as string[];
  }, [filters]);

  const filteredRequests = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter.length > 0 && !statusFilter.includes(r.status)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const title = r.positionDetails?.title ?? "";
      const department = r.positionDetails?.department ?? "";
      return (
        r.requestCode.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        department.toLowerCase().includes(q)
      );
    });
  }, [requests, globalFilter, statusFilter]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { mutateAsync: transitionRequest, isPending: isTransitionPending } =
    useMutation(
      orpc.requests.transition.mutationOptions({
        onSuccess: () => {
          toast.success("Request updated");
          queryClient.invalidateQueries({
            queryKey: orpc.requests.getPendingApprovals.key(),
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

  const openDialog = useCallback(
    (requestId: string, action: Exclude<RequestApprovalAction, "APPROVE">) => {
      setDialogRequestId(requestId);
      setDialogAction(action);
      setComment("");
      setDialogOpen(true);
    },
    [],
  );

  const approve = useCallback(
    async (requestId: string) => {
      await transitionRequest({ requestId, action: "APPROVE" });
    },
    [transitionRequest],
  );

  const confirmDialogAction = useCallback(async () => {
    if (!(dialogRequestId && dialogAction)) {
      return;
    }
    await transitionRequest({
      requestId: dialogRequestId,
      action: dialogAction,
      comment: comment.trim() || undefined,
    });
    setDialogOpen(false);
  }, [dialogRequestId, dialogAction, comment, transitionRequest]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("requestCode", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Code" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground text-xs">
            {getValue()}
          </span>
        ),
        size: 140,
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor((row) => row.positionDetails?.title, {
        id: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Title" />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium text-black dark:text-white">
            {getValue() || "-"}
          </span>
        ),
        size: 260,
        enableSorting: false,
      }),
      columnHelper.accessor((row) => row.positionDetails?.department, {
        id: "department",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Department" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue() || "-"}
          </span>
        ),
        size: 220,
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
          const request = row.original;
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
                    href={`/requests/${request.id}` as Route}
                  >
                    View details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => approve(request.id)}
                >
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => openDialog(request.id, "REQUEST_CHANGE")}
                >
                  Request change…
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => openDialog(request.id, "REJECT")}
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
    data: filteredRequests,
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
    return <RequestsTableSkeleton />;
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="font-medium">No pending request approvals.</div>
          <div className="text-muted-foreground text-sm">
            You’re all caught up.
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/requests">Open requests</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (filteredRequests.length === 0) {
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
        confirmLabel={
          dialogAction === "REQUEST_CHANGE" ? "Request change" : "Reject"
        }
        confirmVariant={dialogAction === "REJECT" ? "destructive" : "default"}
        description="This will notify the requester and update the workflow state."
        isPending={isTransitionPending}
        onCommentChange={setComment}
        onConfirm={confirmDialogAction}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        requireComment={dialogAction === "REQUEST_CHANGE"}
        title={
          dialogAction === "REQUEST_CHANGE"
            ? "Request changes"
            : "Reject request"
        }
      />

      <DataGrid
        isLoading={isFetching}
        recordCount={filteredRequests.length}
        table={table}
        tableLayout={{
          cellBorder: true,
          rowBorder: true,
          rowRounded: true,
          stripped: true,
          headerBorder: true,
          headerSticky: true,
          width: "fixed",
          columnsResizable: false,
          columnsPinnable: false,
          columnsVisibility: true,
        }}
      >
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              aria-label="Search pending requests"
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

function RequestsTableSkeleton() {
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
