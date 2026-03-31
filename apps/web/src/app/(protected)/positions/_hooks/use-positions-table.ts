"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/utils/orpc";
import type { PositionListItem } from "../_components/position-form";

type SortByField = "name" | "createdAt";

const validSortFields: SortByField[] = ["name", "createdAt"];

export function usePositionsTable(columns: ColumnDef<PositionListItem>[]) {
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
    ...orpc.positions.list.queryOptions({
      input: queryInput,
    }),
    placeholderData: (previousData) => previousData,
  });

  const positions = (data?.data ?? []) as PositionListItem[];
  const totalCount = data?.total ?? 0;

  table.setOptions((prev) => ({
    ...prev,
    data: positions,
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
