"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import {
  ROLE_VARIANTS,
  STATUS_VARIANTS,
  type UserListItem,
  type UserRole,
  type UserStatus,
} from "@/types/users";
import { UserRowActions } from "./user-row-actions";

const columnHelper = createColumnHelper<UserListItem>();

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
    size: 200,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("email", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Email" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue()}</span>
    ),
    size: 250,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("sapNo", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="SAP No" />
    ),
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground text-xs">
        {getValue()}
      </span>
    ),
    size: 120,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("departmentName", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Department" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() ?? "N/A"}</span>
    ),
    size: 180,
    enableSorting: false,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("role", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Role" />
    ),
    cell: ({ getValue }) => {
      const roleKey = getValue() as UserRole;
      const role = ROLE_VARIANTS[roleKey] || {
        variant: "secondary" as const,
        label: roleKey,
      };
      return (
        <Badge
          appearance="light"
          className="font-semibold shadow-none"
          variant={role.variant}
        >
          {role.label}
        </Badge>
      );
    },
    size: 120,
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
      const statusKey = getValue() as UserStatus;
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
    size: 120,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.accessor("managerName", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Reports To" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() ?? "—"}</span>
    ),
    size: 180,
    enableSorting: false,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <UserRowActions user={row.original} />,
    size: 80,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: false,
  }),
];
