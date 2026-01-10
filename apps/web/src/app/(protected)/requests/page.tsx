"use client";

import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, FunnelX, MoreHorizontal, Plus, Settings2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
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
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/utils/orpc";

type ManpowerRequest = {
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
};

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

const columnHelper = createColumnHelper<ManpowerRequest>();

export default function RequestsPage() {
  // URL-synced search state
  const [globalFilter, setGlobalFilter] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
  });

  // URL-synced filter states
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [requestTypeFilter, setRequestTypeFilter] = useQueryState(
    "type",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  // Derive filters array from URL state for the Filters component
  const filters = useMemo<Filter[]>(() => {
    const result: Filter[] = [];
    if (statusFilter.length > 0) {
      result.push({
        id: "status",
        field: "status",
        operator: "isAnyOf",
        values: statusFilter,
      });
    }
    if (requestTypeFilter.length > 0) {
      result.push({
        id: "requestType",
        field: "requestType",
        operator: "isAnyOf",
        values: requestTypeFilter,
      });
    }
    return result;
  }, [statusFilter, requestTypeFilter]);

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
    [],
  );

  // Use the useDataTable hook - pagination and sorting synced to URL automatically
  const { table } = useDataTable({
    columns,
    data: [], // Will be replaced with actual data
    pageCount: -1, // Will be updated
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
    },
    shallow: false, // Use router navigation for full URL sync
  });

  const { pagination, sorting } = table.getState();

  // Valid sortBy values for the API
  type SortByField = "status" | "requestCode" | "requestType" | "createdAt" | "title" | "department";
  const validSortFields: SortByField[] = ["status", "requestCode", "requestType", "createdAt", "title", "department"];

  // Build query input from URL-synced state
  const queryInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter.length > 0 ? (statusFilter as ("DRAFT" | "PENDING_MANAGER" | "PENDING_HR" | "PENDING_FINANCE" | "PENDING_CEO" | "APPROVED_OPEN" | "REJECTED" | "HIRING_IN_PROGRESS" | "ARCHIVED")[]) : undefined,
      requestType: requestTypeFilter.length > 0 ? (requestTypeFilter as ("NEW_POSITION" | "REPLACEMENT")[]) : undefined,
      sortBy: (validSortFields.includes(sorting[0]?.id as SortByField) ? sorting[0]?.id : "createdAt") as SortByField,
      sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    }),
    [pagination, debouncedSearch, statusFilter, requestTypeFilter, sorting],
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

  // Update table with fetched data
  table.setOptions((prev) => ({
    ...prev,
    data: requests as ManpowerRequest[],
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    rowCount: totalCount,
  }));

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

  const handleFiltersChange = useCallback(
    (newFilters: Filter[]) => {
      const newStatus =
        (newFilters.find((f) => f.field === "status")?.values ?? []) as string[];
      const newType =
        (newFilters.find((f) => f.field === "requestType")?.values ?? []) as string[];

      setStatusFilter(newStatus.length > 0 ? newStatus : null);
      setRequestTypeFilter(newType.length > 0 ? newType : null);
      table.setPageIndex(0);
    },
    [setStatusFilter, setRequestTypeFilter, table],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter(null);
    setRequestTypeFilter(null);
    table.setPageIndex(0);
  }, [setStatusFilter, setRequestTypeFilter, table]);

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
                table.setPageIndex(0);
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
    </div>
  );
}
