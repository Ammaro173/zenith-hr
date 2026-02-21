"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/utils/orpc";
import type { JobDescriptionListItem } from "../_components/job-description-form";

export function useJobDescriptionsTable(
  columns: ColumnDef<JobDescriptionListItem>[],
) {
  const [globalFilter, setGlobalFilter] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
  });

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const { table, pagination } = useDataTable({
    columns,
    data: [],
    pageCount: -1,
    initialState: {
      sorting: [{ id: "title", desc: false }],
    },
    shallow: false,
  });

  const queryInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: debouncedSearch || undefined,
    }),
    [pagination, debouncedSearch],
  );

  const { data, isLoading, isFetching } = useQuery({
    ...orpc.jobDescriptions.search.queryOptions({
      input: queryInput,
    }),
    placeholderData: (previousData) => previousData,
  });

  const jobDescriptions = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  table.setOptions((prev) => ({
    ...prev,
    data: jobDescriptions as JobDescriptionListItem[],
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    rowCount: totalCount,
  }));

  return {
    table,
    jobDescriptions,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount,
  };
}
