"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { useDataTable } from "@/hooks/use-data-table";
import { orpc } from "@/utils/orpc";
import { columns } from "./columns";

export default function RequestsPage() {
  const { data: requests, isLoading } = useQuery(
    orpc.requests.getMyRequests.queryOptions()
  );

  const { table } = useDataTable({
    data: requests ?? [],
    columns,
    pageCount: requests ? Math.ceil(requests.length / 10) : 0,
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
      sorting: [{ id: "createdAt", desc: true }],
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-10 w-64 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
        <DataTableSkeleton columnCount={6} rowCount={10} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
            Manpower Requests
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track your recruitment requests in one place.
          </p>
        </div>
        <Button
          asChild
          className="bg-black text-white shadow-xs hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          <Link className="gap-2" href="/requests/new" prefetch={false}>
            <Plus className="size-4" />
            New Request
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>
    </div>
  );
}
