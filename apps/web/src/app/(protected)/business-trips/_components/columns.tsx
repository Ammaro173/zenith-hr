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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type BusinessTrip, STATUS_VARIANTS } from "@/types/business-trips";

const columnHelper = createColumnHelper<BusinessTrip>();

export const columns = [
  columnHelper.display({
    id: "destination",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Destination" />
    ),
    cell: ({ row }) => (
      <span className="font-medium text-black dark:text-white">
        {row.original.city}, {row.original.country}
      </span>
    ),
    size: 200,
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("startDate", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Start Date" />
    ),
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground text-xs">
        {format(new Date(getValue()), "dd MMM yyyy")}
      </span>
    ),
    size: 140,
    enableSorting: true,
  }),
  columnHelper.accessor("endDate", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="End Date" />
    ),
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground text-xs">
        {format(new Date(getValue()), "dd MMM yyyy")}
      </span>
    ),
    size: 140,
    enableSorting: false, // sorting by end date not implemented in backend yet usually
  }),
  columnHelper.accessor("estimatedCost", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Est. Cost" />
    ),
    cell: ({ row }) => {
      const cost = row.original.estimatedCost;
      const currency = row.original.currency || "QAR";
      if (!cost) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className="font-mono text-xs">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).format(Number(cost))}
        </span>
      );
    },
    size: 120,
    enableSorting: true,
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
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const trip = row.original;
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
                href={`/business-trips/${trip.id}` as Route}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 80,
    enableHiding: false,
  }),
];
