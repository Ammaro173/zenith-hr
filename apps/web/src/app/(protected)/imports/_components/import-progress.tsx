"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ImportSummary } from "@/types/imports";

/**
 * Status of the import operation
 */
export type ImportStatus =
  | "idle"
  | "validating"
  | "importing"
  | "complete"
  | "cancelled"
  | "error";

/**
 * Props for the ImportProgress component
 */
export interface ImportProgressProps {
  /** Current row being processed */
  current: number;
  /** Total number of rows to process */
  total: number;
  /** Current status of the import operation */
  status: ImportStatus;
  /** Callback when user clicks cancel button */
  onCancel: () => void;
  /** Final summary when import is complete */
  summary?: ImportSummary;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * ImportProgress Component
 *
 * Displays real-time progress of an import operation with:
 * - Progress bar showing percentage complete
 * - Current row / total rows counter
 * - Cancel button during import
 * - Final summary on completion
 *
 * @example
 * ```tsx
 * <ImportProgress
 *   current={50}
 *   total={100}
 *   status="importing"
 *   onCancel={() => console.log('Cancelled')}
 * />
 * ```
 */
export function ImportProgress({
  current,
  total,
  status,
  onCancel,
  summary,
  errorMessage,
}: ImportProgressProps) {
  // Calculate percentage
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  // Determine if import is in progress
  const isInProgress = status === "validating" || status === "importing";
  const isComplete = status === "complete";
  const isCancelled = status === "cancelled";
  const isError = status === "error";

  // Status text
  const getStatusText = () => {
    switch (status) {
      case "validating":
        return "Validating data...";
      case "importing":
        return "Importing data...";
      case "complete":
        return "Import complete!";
      case "cancelled":
        return "Import cancelled";
      case "error":
        return "Import failed";
      default:
        return "Ready to import";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isComplete && (
            <CheckCircle2 className="size-5 text-green-600" role="img" />
          )}
          {(isCancelled || isError) && (
            <XCircle className="size-5 text-red-600" role="img" />
          )}
          {getStatusText()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(isInProgress || isComplete || isCancelled) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {current} / {total} rows
              </span>
              <span className="font-semibold">{percentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full transition-all duration-300 ease-in-out",
                  isComplete && "bg-green-600",
                  isCancelled && "bg-yellow-600",
                  isInProgress && "bg-primary",
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {isError && errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Cancel Button */}
        {isInProgress && (
          <div className="flex justify-end">
            <Button onClick={onCancel} size="sm" variant="outline">
              Cancel Import
            </Button>
          </div>
        )}

        {/* Final Summary */}
        {isComplete && summary && (
          <div className="space-y-2 rounded-md border bg-muted/50 p-4">
            <h4 className="font-semibold text-sm">Import Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{summary.total}</span>
              </div>
              {summary.inserted > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inserted:</span>
                  <span className="font-semibold text-green-600">
                    {summary.inserted}
                  </span>
                </div>
              )}
              {summary.updated > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-semibold text-blue-600">
                    {summary.updated}
                  </span>
                </div>
              )}
              {summary.skipped > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skipped:</span>
                  <span className="font-semibold text-yellow-600">
                    {summary.skipped}
                  </span>
                </div>
              )}
              {summary.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-semibold text-red-600">
                    {summary.failed}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancelled Summary */}
        {isCancelled && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400">
            Import was cancelled. {current} of {total} rows were processed.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
