"use client";

import { FunnelX, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Filters } from "@/components/ui/filters";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsersTable } from "../_hooks/use-users-table";
import { filterFields } from "./filter-config";

export function UsersDataGrid() {
  const {
    table,
    filters,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount,
    handleFiltersChange,
    handleClearFilters,
  } = useUsersTable();

  if (isLoading) {
    return <UsersTableSkeleton />;
  }

  return (
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
        columnsPinnable: false,
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label="Search users"
            className="h-9 w-full sm:max-w-xs"
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.setPageIndex(0);
            }}
            placeholder="Search users..."
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
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
