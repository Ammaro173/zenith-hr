"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { AlertCircle, CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DepartmentImportRow, RowValidationResult } from "@/types/imports";

/**
 * Combined type for department import preview with validation results
 */
export interface DepartmentImportPreviewRow extends DepartmentImportRow {
  rowIndex: number;
  validation?: RowValidationResult;
}

const columnHelper = createColumnHelper<DepartmentImportPreviewRow>();

export const departmentPreviewColumns = [
  columnHelper.display({
    id: "validationStatus",
    header: "Status",
    cell: ({ row }) => {
      const validation = row.original.validation;

      if (!validation) {
        return (
          <Badge appearance="light" className="shadow-none" variant="secondary">
            Pending
          </Badge>
        );
      }

      if (validation.isValid) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600 text-xs">
                    Valid
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Row is valid and ready for import</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-600 text-xs">
                  Invalid
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                {validation.errors.map((error, idx) => (
                  <p className="text-xs" key={idx}>
                    <span className="font-semibold">{error.field}:</span>{" "}
                    {error.message}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 100,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: true,
  }),
  columnHelper.display({
    id: "operation",
    header: "Op",
    cell: ({ row }) => {
      const validation = row.original.validation;
      const willUpdate = validation?.willUpdate ?? false;

      if (willUpdate) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Will update existing record</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <Plus className="h-4 w-4 text-green-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Will insert new record</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 60,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: true,
  }),
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
  columnHelper.accessor("costCenterCode", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Cost Center Code" />
    ),
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground text-xs">
        {getValue()}
      </span>
    ),
    size: 180,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    enablePinning: true,
  }),
];
