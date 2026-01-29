"use client";

import { format } from "date-fns";
import { FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type ImportHistory,
  useImportHistory,
} from "../_hooks/use-import-history";

/**
 * Props for the ImportHistoryComponent
 */
interface ImportHistoryComponentProps {
  /**
   * Optional filter by import type
   */
  type?: "users" | "departments";
  /**
   * Optional callback when a history item is clicked
   */
  onViewDetails?: (historyId: string) => void;
  /**
   * Optional limit for number of items to display
   */
  limit?: number;
}

/**
 * Import History Component
 *
 * Displays a list of past imports in Card components.
 * Shows timestamp, user, type, and counts for each import.
 * Supports clicking to view detailed results.
 *
 * Requirements: 5.1, 5.2, 5.3, 7.1
 *
 * @example
 * ```tsx
 * <ImportHistoryComponent
 *   type="users"
 *   onViewDetails={(id) => console.log('View details for', id)}
 *   limit={10}
 * />
 * ```
 */
export function ImportHistoryComponent({
  type,
  onViewDetails,
  limit = 10,
}: ImportHistoryComponentProps) {
  const { data: history, isLoading, error } = useImportHistory({ type, limit });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Failed to load import history
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FileText className="mb-2 h-8 w-8 opacity-50" />
            <p>No import history yet</p>
            <p className="text-xs">Your past imports will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((item) => (
            <ImportHistoryItem
              history={item}
              key={item.id}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Props for the ImportHistoryItem component
 */
interface ImportHistoryItemProps {
  history: ImportHistory;
  onViewDetails?: (historyId: string) => void;
}

/**
 * Individual import history item component
 *
 * Displays a single import history record with all relevant information.
 */
function ImportHistoryItem({ history, onViewDetails }: ImportHistoryItemProps) {
  const hasFailures = history.failedCount > 0;
  const hasSkipped = history.skippedCount > 0;

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(history.id);
    }
  };

  // Render status badge based on import results
  const renderStatusBadge = () => {
    if (hasFailures) {
      return (
        <Badge className="bg-red-100 text-red-700" variant="secondary">
          Failed
        </Badge>
      );
    }
    if (hasSkipped) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700" variant="secondary">
          Partial
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700" variant="secondary">
        Success
      </Badge>
    );
  };

  return (
    <button
      className={cn(
        "w-full rounded-lg border p-4 text-left transition-all hover:border-primary hover:shadow-sm",
        onViewDetails && "cursor-pointer",
      )}
      disabled={!onViewDetails}
      onClick={handleClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Icon and main info */}
        <div className="flex gap-3">
          <div
            className={cn(
              "rounded-lg p-2",
              history.type === "users"
                ? "bg-blue-100 text-blue-600"
                : "bg-purple-100 text-purple-600",
            )}
          >
            {history.type === "users" ? (
              <Users className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            {/* Type and filename */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {history.type === "users" ? "Users" : "Departments"}
              </Badge>
              {history.filename && (
                <span className="text-muted-foreground text-sm">
                  {history.filename}
                </span>
              )}
            </div>

            {/* User and timestamp */}
            <div className="text-muted-foreground text-xs">
              Imported by {history.userName} •{" "}
              {format(new Date(history.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>

            {/* Counts summary */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs">
                <span className="font-medium">{history.totalRows}</span> total
              </span>
              {history.insertedCount > 0 && (
                <span className="text-green-600 text-xs">
                  <span className="font-medium">{history.insertedCount}</span>{" "}
                  inserted
                </span>
              )}
              {history.updatedCount > 0 && (
                <span className="text-blue-600 text-xs">
                  <span className="font-medium">{history.updatedCount}</span>{" "}
                  updated
                </span>
              )}
              {hasSkipped && (
                <span className="text-xs text-yellow-600">
                  <span className="font-medium">{history.skippedCount}</span>{" "}
                  skipped
                </span>
              )}
              {hasFailures && (
                <span className="text-red-600 text-xs">
                  <span className="font-medium">{history.failedCount}</span>{" "}
                  failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Status indicator */}
        <div className="flex flex-col items-end gap-1">
          {renderStatusBadge()}
          {history.upsertMode && (
            <Badge className="text-xs" variant="outline">
              Upsert
            </Badge>
          )}
        </div>
      </div>

      {/* View details button (only shown if onViewDetails is provided) */}
      {onViewDetails && (
        <div className="mt-3 flex justify-end border-t pt-3">
          <span className="text-primary text-xs">View Details →</span>
        </div>
      )}
    </button>
  );
}
