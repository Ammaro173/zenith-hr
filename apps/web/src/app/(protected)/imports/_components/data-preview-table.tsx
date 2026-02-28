"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DataGrid,
  DataGridContainer,
  useDataGrid,
} from "@/components/ui/data-grid";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRowCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
} from "@/components/ui/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { RowValidationResult } from "@/types/imports";

interface DataPreviewTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyMessage?: string;
  isLoading?: boolean;
  validationResults?: RowValidationResult[];
}

export function DataPreviewTable<TData extends { rowIndex: number }>({
  data,
  columns,
  validationResults = [],
  isLoading = false,
  emptyMessage = "No data to preview",
}: DataPreviewTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Merge validation results into data
  const dataWithValidation = useMemo(() => {
    return data.map((row) => {
      const validation = validationResults.find(
        (v) => v.rowIndex === row.rowIndex,
      );
      return {
        ...row,
        validation,
      };
    });
  }, [data, validationResults]);

  // Calculate validation summary
  const validationSummary = useMemo(() => {
    if (validationResults.length === 0) {
      return {
        total: data.length,
        valid: 0,
        invalid: 0,
        pending: data.length,
      };
    }

    const valid = validationResults.filter((v) => v.isValid).length;
    const invalid = validationResults.filter((v) => !v.isValid).length;

    return {
      total: data.length,
      valid,
      invalid,
      pending: data.length - validationResults.length,
    };
  }, [data.length, validationResults]);

  const table = useReactTable({
    data: dataWithValidation,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Validation Summary */}
      {validationResults.length > 0 && (
        <Alert>
          <AlertDescription className="flex items-center gap-4 text-sm">
            <span className="font-medium">Validation Summary:</span>
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="font-semibold">{validationSummary.total}</span>
            </span>
            {validationSummary.valid > 0 && (
              <span className="text-green-600">
                Valid:{" "}
                <span className="font-semibold">{validationSummary.valid}</span>
              </span>
            )}
            {validationSummary.invalid > 0 && (
              <span className="text-red-600">
                Invalid:{" "}
                <span className="font-semibold">
                  {validationSummary.invalid}
                </span>
              </span>
            )}
            {validationSummary.pending > 0 && (
              <span className="text-muted-foreground">
                Pending:{" "}
                <span className="font-semibold">
                  {validationSummary.pending}
                </span>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Grid */}
      <DataGrid
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        loadingMode="spinner"
        recordCount={data.length}
        table={table}
        tableLayout={{
          cellBorder: true,
          rowBorder: true,
          rowRounded: false,
          stripped: false,
          headerBorder: true,
          headerSticky: true,
          width: "fixed",
          columnsResizable: false,
          columnsPinnable: true,
          columnsVisibility: false,
        }}
      >
        <DataGridContainer>
          <ScrollArea>
            <DataPreviewTableWithValidation />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </DataGrid>
    </div>
  );
}

/**
 * Custom DataGridTable that highlights invalid rows with red background
 */
function DataPreviewTableWithValidation() {
  const { table, isLoading, props } = useDataGrid();

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup, index) => (
          <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
            {headerGroup.headers.map((header, headerIndex) => {
              const { column } = header;

              return (
                <DataGridTableHeadRowCell header={header} key={headerIndex}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  {props.tableLayout?.columnsResizable &&
                    column.getCanResize() && (
                      <DataGridTableHeadRowCellResize header={header} />
                    )}
                </DataGridTableHeadRowCell>
              );
            })}
          </DataGridTableHeadRow>
        ))}
      </DataGridTableHead>

      <DataGridTableBody>
        {isLoading && props.loadingMode === "spinner" && (
          <tr>
            <td className="p-8" colSpan={table.getVisibleFlatColumns().length}>
              <div className="flex items-center justify-center">
                <svg
                  className="mr-3 -ml-1 h-5 w-5 animate-spin text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  />
                </svg>
                {props.loadingMessage || "Loading..."}
              </div>
            </td>
          </tr>
        )}
        {!isLoading &&
          table.getPaginationRowModel().rows.length > 0 &&
          table.getPaginationRowModel().rows.map((row, index) => {
            // Check if row is invalid
            const validation = row.original.validation as
              | RowValidationResult
              | undefined;
            const isInvalid = validation && !validation.isValid;

            return (
              <Fragment key={row.id}>
                <tr
                  className={cn(
                    "hover:bg-muted/40",
                    props.onRowClick && "cursor-pointer",
                    props.tableLayout?.rowBorder &&
                      "border-border border-b [&:not(:last-child)>td]:border-b",
                    props.tableLayout?.cellBorder && "*:last:border-e-0",
                    // Invalid row styling with red background
                    isInvalid &&
                      "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30",
                  )}
                  key={index}
                  onClick={() => props.onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell, colIndex) => (
                    <DataGridTableBodyRowCell cell={cell} key={colIndex}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </DataGridTableBodyRowCell>
                  ))}
                </tr>
              </Fragment>
            );
          })}
        {!isLoading && table.getPaginationRowModel().rows.length === 0 && (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}
