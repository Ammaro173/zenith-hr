"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Eye, FunnelX, MoreHorizontal, Plus, Settings2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/components/ui/filters";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/utils/orpc";

interface ManpowerRequest {
  id: string;
  requestCode: string;
  requestType: "NEW_POSITION" | "REPLACEMENT";
  status: string;
  createdAt: Date | string;
  positionDetails: {
    title?: string;
    department?: string;
    description?: string;
    location?: string;
  };
  budgetDetails: unknown;
}

const statusVariants: Record<
  string,
  {
    variant:
      | "success"
      | "warning"
      | "destructive"
      | "info"
      | "primary"
      | "secondary";
    label: string;
  }
> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  PENDING_MANAGER: { variant: "warning", label: "Pending Manager" },
  PENDING_HR: { variant: "warning", label: "Pending HR" },
  PENDING_FINANCE: { variant: "warning", label: "Pending Finance" },
  PENDING_CEO: { variant: "warning", label: "Pending CEO" },
  APPROVED_OPEN: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  HIRING_IN_PROGRESS: { variant: "info", label: "Hiring" },
  ARCHIVED: { variant: "secondary", label: "Archived" },
};

const statusOptions = Object.entries(statusVariants).map(([key, value]) => ({
  label: value.label,
  value: key,
}));

const typeOptions = [
  { label: "New Position", value: "NEW_POSITION" },
  { label: "Replacement", value: "REPLACEMENT" },
];

export default function RequestsPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  // Extract filter values for the API call
  const statusFilter = useMemo(() => {
    const filter = filters.find((f) => f.field === "status");
    return filter?.values && filter.values.length > 0
      ? filter.values
      : undefined;
  }, [filters]);

  const requestTypeFilter = useMemo(() => {
    const filter = filters.find((f) => f.field === "requestType");
    return filter?.values && filter.values.length > 0
      ? (filter.values as ("NEW_POSITION" | "REPLACEMENT")[])
      : undefined;
  }, [filters]);

  // Build input object with stable reference
  const queryInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter as any,
      requestType: requestTypeFilter as any,
      sortBy: (sorting[0]?.id as any) || "createdAt",
      sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      statusFilter,
      requestTypeFilter,
      sorting,
    ],
  );

  // Fetch data from API
  const { data, isLoading, isFetching } = useQuery({
    ...orpc.requests.getMyRequests.queryOptions({
      input: queryInput,
    }),
    placeholderData: (previousData) => previousData,
  });

  const requests = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  const columnHelper = createColumnHelper<ManpowerRequest>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("requestCode", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Code" />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium text-black dark:text-white">
            {getValue()}
          </span>
        ),
        size: 180,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        enablePinning: true,
      }),
      columnHelper.accessor((row) => row.positionDetails?.title ?? "", {
        id: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Position Title" />
        ),
        cell: ({ getValue }) => (
          <span className="block max-w-[200px] truncate font-medium">
            {getValue() || "N/A"}
          </span>
        ),
        size: 200,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        enablePinning: true,
      }),
      columnHelper.accessor((row) => row.positionDetails?.department ?? "", {
        id: "department",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Department" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() || "N/A"}</span>
        ),
        size: 180,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        enablePinning: true,
      }),
      columnHelper.accessor("requestType", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Type" />
        ),
        cell: ({ getValue }) => (
          <Badge appearance="light" className="capitalize" variant="outline">
            {getValue().toLowerCase().replace("_", " ")}
          </Badge>
        ),
        size: 150,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        enablePinning: true,
      }),
      columnHelper.accessor("status", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Status" />
        ),
        cell: ({ getValue }) => {
          const statusKey = getValue();
          const status = statusVariants[statusKey] || {
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
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        enablePinning: true,
      }),
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Created At" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground text-xs">
            {format(new Date(getValue()), "dd MMM yyyy")}
          </span>
        ),
        size: 140,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        enablePinning: true,
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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    className="cursor-pointer"
                    href={`/requests/${request.id}` as Route}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(request.requestCode);
                  }}
                >
                  Copy Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 80,
        enableHiding: false,
      }),
    ],
    [columnHelper],
  );

  // Filter field configuration
  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "requestType",
        label: "Type",
        type: "select",
        placeholder: "Filter by type...",
        options: typeOptions,
        searchable: true,
        className: "w-[160px]",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        placeholder: "Filter by status...",
        options: statusOptions,
        searchable: true,
        className: "w-[180px]",
      },
    ],
    [],
  );

  const handleFiltersChange = useCallback((newFilters: Filter[]) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const table = useReactTable({
    columns,
    // Pass API data as the source of truth
    data: requests as ManpowerRequest[],
    state: {
      pagination,
      sorting,
    },
    enableSorting: true,
    enableSortingRemoval: false,
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
            Manpower Requests
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track your recruitment requests in one place.
          </p>
        </div>
        <Button
          asChild
          className="bg-black text-white shadow-xs hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          <Link className="gap-2" href="/requests/new" prefetch={false}>
            <Plus className="size-4" />
            New Request
          </Link>
        </Button>
      </div>

      <DataGrid
        isLoading={isFetching}
        recordCount={totalCount}
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
          columnsPinnable: true,
          columnsVisibility: true,
        }}
      >
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              aria-label="Search all columns"
              className="h-9 w-full sm:max-w-xs"
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              placeholder="Search requests..."
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
              <Button
                onClick={() => handleFiltersChange([])}
                size="sm"
                variant="ghost"
              >
                <FunnelX className="mr-2 h-4 w-4" />
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
    </div>
  );
}
