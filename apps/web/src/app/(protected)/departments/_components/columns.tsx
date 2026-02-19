"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import type { DepartmentListItem } from "@/types/departments";
import { DepartmentRowActions } from "./department-row-actions";

const columnHelper = createColumnHelper<DepartmentListItem>();

export const columns = [
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Name" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium text-black dark:text-white">
        {getValue()}
      </span>
    ),
    size: 250,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Created" />
    ),
    cell: ({ getValue }) => {
      const date = getValue();
      if (!date) {
        return <span className="text-muted-foreground">—</span>;
      }
      const formatted = new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return <span className="text-muted-foreground text-sm">{formatted}</span>;
    },
    size: 140,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <DepartmentRowActions department={row.original} />,
    size: 80,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: false,
  }),
];
