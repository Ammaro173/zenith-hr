"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, MoreHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Use a simpler approach to get the type to avoid complex inference issues
type ManpowerRequest = {
  id: string;
  requestCode: string;
  requestType: "NEW_POSITION" | "REPLACEMENT";
  status: string;
  createdAt: Date | string;
  positionDetails: unknown;
  budgetDetails: unknown;
};

const columnHelper = createColumnHelper<ManpowerRequest>();

const statusVariants: Record<
  string,
  {
    variant:
      | "success"
      | "warning"
      | "destructive"
      | "info"
      | "primary"
      | "secondary";
    label: string;
  }
> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  PENDING_MANAGER: { variant: "warning", label: "Pending Manager" },
  PENDING_HR: { variant: "warning", label: "Pending HR" },
  PENDING_FINANCE: { variant: "warning", label: "Pending Finance" },
  PENDING_CEO: { variant: "warning", label: "Pending CEO" },
  APPROVED_OPEN: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  HIRING_IN_PROGRESS: { variant: "info", label: "Hiring" },
  ARCHIVED: { variant: "secondary", label: "Archived" },
};

export const columns = [
  columnHelper.accessor("requestCode", {
    header: "Code",
    cell: ({ getValue }) => (
      <span className="font-medium text-black dark:text-white">
        {getValue()}
      </span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Code",
      variant: "text",
      placeholder: "Search code...",
    },
  }),
  columnHelper.accessor(
    (row: ManpowerRequest) =>
      (row.positionDetails as { title?: string })?.title,
    {
      id: "title",
      header: "Position Title",
      cell: ({ getValue }) => (
        <span className="block max-w-[200px] truncate">
          {getValue() || "N/A"}
        </span>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Title",
        variant: "text",
        placeholder: "Search title...",
      },
    }
  ),
  columnHelper.accessor(
    (row: ManpowerRequest) =>
      (row.positionDetails as { department?: string })?.department,
    {
      id: "department",
      header: "Department",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() || "N/A"}</span>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Department",
        variant: "text",
        placeholder: "Search department...",
      },
    }
  ),
  columnHelper.accessor("requestType", {
    header: "Type",
    cell: ({ getValue }) => (
      <Badge appearance="light" className="capitalize" variant="outline">
        {getValue().toLowerCase().replace("_", " ")}
      </Badge>
    ),
    enableColumnFilter: true,
    meta: {
      label: "Type",
      variant: "select",
      options: [
        { label: "New Position", value: "NEW_POSITION" },
        { label: "Replacement", value: "REPLACEMENT" },
      ],
    },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = statusVariants[getValue()] || {
        variant: "secondary",
        label: getValue(),
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
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "select",
      options: Object.entries(statusVariants).map(([key, value]) => ({
        label: value.label,
        value: key,
      })),
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Created At",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground text-xs">
        {format(new Date(getValue()), "dd MMM yyyy")}
      </span>
    ),
    enableSorting: true,
  }),
  columnHelper.display({
    id: "actions",
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
  }),
];
