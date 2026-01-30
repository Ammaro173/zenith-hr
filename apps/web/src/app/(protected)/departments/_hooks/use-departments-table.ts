"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { DepartmentListItem } from "@/types/departments";
import { orpc } from "@/utils/orpc";
import { columns } from "../_components/columns";

export type SortByField = "name" | "costCenterCode" | "createdAt";

const validSortFields: SortByField[] = ["name", "costCenterCode", "createdAt"];

export function useDepartmentsTable() {
  // URL-synced search state
  const [globalFilter, setGlobalFilter] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
  });

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

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
      sortBy: (validSortFields.includes(sorting[0]?.id as SortByField)
        ? sorting[0]?.id
        : "name") as SortByField,
      sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    }),
    [pagination, debouncedSearch, sorting],
  );

  const { data, isLoading, isFetching } = useQuery({
    ...orpc.departments.list.queryOptions({
      input: queryInput,
    }),
    placeholderData: (previousData) => previousData,
  });

  const departments = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  // Sync table state with fetched data
  table.setOptions((prev) => ({
    ...prev,
    data: departments as DepartmentListItem[],
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    rowCount: totalCount,
  }));

  return {
    table,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount,
  };
}
