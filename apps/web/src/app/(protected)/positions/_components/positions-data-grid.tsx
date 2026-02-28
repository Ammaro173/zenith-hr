"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoleFromSessionUser } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { usePositionsTable } from "../_hooks/use-positions-table";
import { DeletePositionDialog } from "./delete-position-dialog";
import type { PositionListItem } from "./position-form";

export function PositionsDataGrid() {
  const { data: session } = authClient.useSession();
  const currentRole = getRoleFromSessionUser(session?.user);
  const canManage =
    currentRole === "ADMIN" ||
    currentRole === "HOD_HR" ||
    currentRole === "MANAGER";

  const [deleteItem, setDeleteItem] = useState<PositionListItem | null>(null);

  const columns: ColumnDef<PositionListItem>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-muted-foreground text-sm">
          {row.original.description ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.role}</span>
      ),
    },
    {
      accessorKey: "departmentName",
      header: "Department",
      cell: ({ row }) => {
        const departmentName = row.original.departmentName;
        if (!departmentName) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return <span className="text-sm">{departmentName}</span>;
      },
    },
    {
      accessorKey: "reportsToPositionName",
      header: "Reports To",
      cell: ({ row }) => {
        const positionName = row.original.reportsToPositionName;
        if (!positionName) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return <span className="text-sm">{positionName}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        if (!canManage) {
          return null;
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="size-8 p-0" variant="ghost">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/positions/${row.original.id}/edit` as Route}>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteItem(row.original)}
              >
                <Trash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const {
    table,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isFetching,
    totalCount,
  } = usePositionsTable(columns);

  if (isLoading) {
    return <PositionsTableSkeleton />;
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
        columnsVisibility: false,
      }}
    >
      <div className="w-full space-y-4">
        <p className="text-muted-foreground text-sm">
          Positions define seats in the organization. Each position has a role,
          department, and reporting structure.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label="Search positions"
            className="h-9 w-full sm:max-w-xs"
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.setPageIndex(0);
            }}
            placeholder="Search positions..."
            type="text"
            value={globalFilter}
          />
          <div className="flex items-center gap-2">
            {canManage && (
              <Button asChild size="sm">
                <Link href={"/positions/new" as Route}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Position
                </Link>
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
      </div>

      <DeletePositionDialog
        onOpenChange={(open) => !open && setDeleteItem(null)}
        open={!!deleteItem}
        position={deleteItem}
      />
    </DataGrid>
  );
}

function PositionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-100 w-full" />
    </div>
  );
}
