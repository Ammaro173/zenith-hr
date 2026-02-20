"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { client } from "@/utils/orpc";

export function useJobDescriptionsTable() {
  const [globalFilter, setGlobalFilter] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
  });

  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const {
    data: jobDescriptions,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["jobDescriptions", "search", debouncedSearch],
    queryFn: () =>
      client.jobDescriptions.search({ search: debouncedSearch, limit: 50 }),
    placeholderData: (previousData) => previousData,
  });

  return {
    jobDescriptions: jobDescriptions ?? [],
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
  };
}
