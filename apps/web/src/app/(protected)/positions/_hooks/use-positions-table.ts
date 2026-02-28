"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/utils/orpc";
import type { PositionListItem } from "../_components/position-form";

export function usePositionsTable(columns: ColumnDef<PositionListItem>[]) {
  const [globalFilter, setGlobalFilter] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
  });

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const { table } = useDataTable({
    columns,
    data: [],
    pageCount: 1,
    initialState: {
      sorting: [{ id: "name", desc: false }],
    },
    shallow: false,
  });

  const queryInput = useMemo(
    () => ({
      query: debouncedSearch,
      limit: 100,
    }),
    [debouncedSearch],
  );

  const { data, isLoading, isFetching } = useQuery({
    ...orpc.positions.search.queryOptions({
      input: queryInput,
    }),
    placeholderData: (previousData) => previousData,
  });

  const positions = (data ?? []) as PositionListItem[];

  table.setOptions((prev) => ({
    ...prev,
    data: positions,
    pageCount: 1,
    rowCount: positions.length,
  }));

  return {
    table,
    positions,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount: positions.length,
  };
}
