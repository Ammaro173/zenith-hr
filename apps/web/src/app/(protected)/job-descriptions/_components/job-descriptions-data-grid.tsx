"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";
import { DeleteJobDescriptionDialog } from "./delete-job-description-dialog";
import type { JobDescriptionListItem } from "./job-description-form";

export function JobDescriptionsDataGrid() {
  const { data: session } = authClient.useSession();
  const currentRole = getRoleFromSessionUser(session?.user);
  const canManage =
    currentRole === "ADMIN" ||
    currentRole === "HR" ||
    currentRole === "MANAGER";

  const [deleteItem, setDeleteItem] = useState<JobDescriptionListItem | null>(
    null,
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const {
    data: jobDescriptions,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["jobDescriptions", "search", debouncedSearch],
    queryFn: () =>
      client.jobDescriptions.search({ search: debouncedSearch, limit: 50 }),
  });

  const columns: ColumnDef<JobDescriptionListItem>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-muted-foreground text-sm">
          {row.original.description}
        </span>
      ),
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
                <Link
                  href={`/job-descriptions/${row.original.id}/edit` as Route}
                >
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

  const table = useReactTable({
    data: jobDescriptions ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Only show skeleton on very first load when we have no data at all
  // This prevents the skeleton from showing when searching (which would lose input focus)
  if (isLoading && !jobDescriptions) {
    return <JobDescriptionsTableSkeleton />;
  }

  return (
    <DataGrid
      isLoading={isFetching}
      recordCount={jobDescriptions?.length ?? 0}
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
        columnsVisibility: false,
      }}
    >
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label="Search job descriptions"
            className="h-9 w-full sm:max-w-xs"
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search job descriptions..."
            type="text"
            value={globalFilter}
          />
          <div className="flex items-center gap-2">
            {canManage && (
              <Button asChild size="sm">
                <Link href={"/job-descriptions/new" as Route}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Job Description
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
        <DataGridPagination />
      </div>

      <DeleteJobDescriptionDialog
        jobDescription={deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        open={!!deleteItem}
      />
    </DataGrid>
  );
}

function JobDescriptionsTableSkeleton() {
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
