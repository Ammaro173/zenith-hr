"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import type { Filter } from "@/components/ui/filters";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { UserListItem, UserRole, UserStatus } from "@/types/users";
import { orpc } from "@/utils/orpc";
import { columns } from "../_components/columns";

export type SortByField =
  | "name"
  | "email"
  | "role"
  | "status"
  | "sapNo"
  | "createdAt";

const validSortFields: SortByField[] = [
  "name",
  "email",
  "role",
  "status",
  "sapNo",
  "createdAt",
];

export function useUsersTable() {
  // URL-synced search state
  const [globalFilter, setGlobalFilter] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
  });

  // URL-synced filter states
  const [roleFilter, setRoleFilter] = useQueryState(
    "role",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  // Derive filters array from URL state for the Filters component
  const filters = useMemo<Filter[]>(() => {
    const result: Filter[] = [];
    if (roleFilter.length > 0) {
      result.push({
        id: "role",
        field: "role",
        operator: "isAnyOf",
        values: roleFilter,
      });
    }
    if (statusFilter.length > 0) {
      result.push({
        id: "status",
        field: "status",
        operator: "isAnyOf",
        values: statusFilter,
      });
    }
    return result;
  }, [roleFilter, statusFilter]);

  const { table, sorting, pagination } = useDataTable({
    columns,
    data: [],
    pageCount: -1,
    initialState: {
      sorting: [{ id: "name", desc: false }],
    },
    shallow: false,
  });

  const queryInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: debouncedSearch || undefined,
      role: roleFilter.length > 0 ? (roleFilter as UserRole[]) : undefined,
      status:
        statusFilter.length > 0 ? (statusFilter as UserStatus[]) : undefined,
      sortBy: (validSortFields.includes(sorting[0]?.id as SortByField)
        ? sorting[0]?.id
        : "name") as SortByField,
      sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    }),
    [pagination, debouncedSearch, roleFilter, statusFilter, sorting],
  );

  const { data, isLoading, isFetching } = useQuery({
    ...orpc.users.list.queryOptions({
      input: queryInput,
    }),
    placeholderData: (previousData) => previousData,
  });

  const users = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  // Sync table state with fetched data
  table.setOptions((prev) => ({
    ...prev,
    data: users as UserListItem[],
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    rowCount: totalCount,
  }));

  const handleFiltersChange = useCallback(
    (newFilters: Filter[]) => {
      const newRole = (newFilters.find((f) => f.field === "role")?.values ??
        []) as string[];
      const newStatus = (newFilters.find((f) => f.field === "status")?.values ??
        []) as string[];

      setRoleFilter(newRole.length > 0 ? newRole : null);
      setStatusFilter(newStatus.length > 0 ? newStatus : null);
      table.setPageIndex(0);
    },
    [setRoleFilter, setStatusFilter, table],
  );

  const handleClearFilters = useCallback(() => {
    setRoleFilter(null);
    setStatusFilter(null);
    table.setPageIndex(0);
  }, [setRoleFilter, setStatusFilter, table]);

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
  };
}
