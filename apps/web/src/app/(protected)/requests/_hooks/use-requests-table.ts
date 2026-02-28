"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import type { Filter } from "@/components/ui/filters";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  ManpowerRequest,
  RequestStatus,
  RequestType,
} from "@/types/requests";
import { orpc } from "@/utils/orpc";
import { columns } from "../_components/columns";

export type SortByField =
  | "status"
  | "requestCode"
  | "requestType"
  | "createdAt"
  | "title"
  | "department";
const validSortFields: SortByField[] = [
  "status",
  "requestCode",
  "requestType",
  "createdAt",
  "title",
  "department",
];

export function useRequestsTable() {
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
        statusFilter.length > 0 ? (statusFilter as RequestStatus[]) : undefined,
      requestType:
        requestTypeFilter.length > 0
          ? (requestTypeFilter as RequestType[])
          : undefined,
      sortBy: (validSortFields.includes(sorting[0]?.id as SortByField)
        ? sorting[0]?.id
        : "createdAt") as SortByField,
      sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    }),
    [pagination, debouncedSearch, statusFilter, requestTypeFilter, sorting],
  );

  const isAllRelatedView = viewTab === "all-related";

  const { data, isLoading, isFetching } = useQuery({
    ...(isAllRelatedView
      ? orpc.requests.getAllRelated.queryOptions({
          input: queryInput,
        })
      : orpc.requests.getMyRequests.queryOptions({
          input: queryInput,
        })),
    placeholderData: (previousData) => previousData,
  });

  const requests = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  // Sync table state with fetched data
  table.setOptions((prev) => ({
    ...prev,
    data: requests as ManpowerRequest[],
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    rowCount: totalCount,
  }));

  const handleFiltersChange = useCallback(
    (newFilters: Filter[]) => {
      const newStatus = (newFilters.find((f) => f.field === "status")?.values ??
        []) as string[];
      const newType = (newFilters.find((f) => f.field === "requestType")
        ?.values ?? []) as string[];

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
