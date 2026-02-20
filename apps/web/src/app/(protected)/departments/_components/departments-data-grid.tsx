"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { useDepartmentsTable } from "../_hooks/use-departments-table";
import { CreateDepartmentDialog } from "./create-department-dialog";

export function DepartmentsDataGrid() {
  const { data: session } = authClient.useSession();
  const currentRole = getRoleFromSessionUser(session?.user);
  const canCreateDepartment = currentRole === "ADMIN" || currentRole === "HR";

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    table,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount,
  } = useDepartmentsTable();

  if (isLoading) {
    return <DepartmentsTableSkeleton />;
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
        columnsResizable: false,
        columnsPinnable: false,
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label="Search departments"
            className="h-9 w-full sm:max-w-xs"
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.setPageIndex(0);
            }}
            placeholder="Search departments..."
            type="text"
            value={globalFilter}
          />
          <div className="flex items-center gap-2">
            {canCreateDepartment && (
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Department
              </Button>
            )}
          </div>
        </div>

        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>

      <CreateDepartmentDialog
        onOpenChange={setShowCreateDialog}
        open={showCreateDialog}
      />
    </DataGrid>
  );
}

function DepartmentsTableSkeleton() {
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
