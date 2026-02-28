"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import type { Filter } from "@/components/ui/filters";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { TripStatus } from "@/types/business-trips";
import { orpc } from "@/utils/orpc";
import { columns } from "../_components/columns";

export type SortByField =
  | "status"
  | "createdAt"
  | "country"
  | "startDate"
  | "estimatedCost";
const validSortFields: SortByField[] = [
  "status",
  "createdAt",
  "country",
  "startDate",
  "estimatedCost",
];

export function useBusinessTripsTable() {
  // Tab state: "all-related" (default) or "my-requests"
  const [viewTab, setViewTab] = useQueryState("view", {
    defaultValue: "all-related",
    shallow: false,
  });

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
    return result;
  }, [statusFilter]);

  const { table, sorting, pagination } = useDataTable({
    columns,
    data: [],
    pageCount: -1,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
    },
    shallow: false,
  });

  const queryInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: debouncedSearch || undefined,
      status:
        statusFilter.length > 0 ? (statusFilter as TripStatus[]) : undefined,
      sortBy: (validSortFields.includes(sorting[0]?.id as SortByField)
        ? sorting[0]?.id
        : "createdAt") as SortByField,
      sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    }),
    [pagination, debouncedSearch, statusFilter, sorting],
  );

  const isAllRelatedView = viewTab === "all-related";

  const { data, isLoading, isFetching } = useQuery({
    ...(isAllRelatedView
      ? orpc.businessTrips.getAllRelated.queryOptions({
          input: queryInput,
        })
      : orpc.businessTrips.getMyTrips.queryOptions({
          input: queryInput,
        })),
    placeholderData: (previousData) => previousData,
  });

  const trips = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  // Sync table state with fetched data
  table.setOptions((prev) => ({
    ...prev,
    data: trips,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    rowCount: totalCount,
  }));

  const handleFiltersChange = useCallback(
    (newFilters: Filter[]) => {
      const newStatus = (newFilters.find((f) => f.field === "status")?.values ??
        []) as string[];

      setStatusFilter(newStatus.length > 0 ? newStatus : null);
      table.setPageIndex(0);
    },
    [setStatusFilter, table],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter(null);
    table.setPageIndex(0);
  }, [setStatusFilter, table]);

  return {
    table,
    filters,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount,
    handleFiltersChange,
    handleClearFilters,
    viewTab,
    setViewTab,
  };
}
