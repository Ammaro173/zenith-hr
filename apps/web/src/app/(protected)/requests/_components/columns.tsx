"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, MoreHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ManpowerRequest, STATUS_VARIANTS } from "@/types/requests";

const columnHelper = createColumnHelper<ManpowerRequest>();

export const columns = [
  columnHelper.accessor("requestCode", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Code" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium text-black dark:text-white">
        {getValue()}
      </span>
    ),
    size: 180,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor((row) => row.positionDetails?.title ?? "", {
    id: "title",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Position Title" />
    ),
    cell: ({ getValue }) => (
      <span className="block max-w-50 truncate font-medium">
        {getValue() || "N/A"}
      </span>
    ),
    size: 200,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor((row) => row.positionDetails?.department ?? "", {
    id: "department",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Department" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() || "N/A"}</span>
    ),
    size: 180,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("requestType", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Type" />
    ),
    cell: ({ getValue }) => (
      <Badge appearance="light" className="capitalize" variant="outline">
        {getValue().toLowerCase().replace("_", " ")}
      </Badge>
    ),
    size: 150,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("status", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ getValue }) => {
      const statusKey = getValue();
      const status = STATUS_VARIANTS[statusKey] || {
        variant: "secondary" as const,
        label: statusKey,
      };
      return (
        <Badge
          appearance="light"
          className="font-semibold shadow-none"
          variant={status.variant}
        >
          {status.label}
        </Badge>
      );
    },
    size: 160,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Created At" />
    ),
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground text-xs">
        {format(new Date(getValue()), "dd MMM yyyy")}
      </span>
    ),
    size: 140,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const request = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8 p-0" variant="ghost">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                className="cursor-pointer"
                href={`/requests/${request.id}` as Route}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(request.requestCode);
              }}
            >
              Copy Code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 80,
    enableHiding: false,
  }),
];
