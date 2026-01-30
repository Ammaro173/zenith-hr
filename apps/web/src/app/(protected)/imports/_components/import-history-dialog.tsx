"use client";

import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type ImportHistoryItem,
  useImportHistoryDetails,
} from "../_hooks/use-import-history";

/**
 * Props for the ImportHistoryDialog component
 */
interface ImportHistoryDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The import history ID to display details for
   */
  importId: string;
}

/**
 * Import History Dialog Component
 *
 * Displays detailed results for a selected import operation.
 * Shows each row with status and error message in a table format.
 *
 * Features:
 * - Displays import metadata (type, user, timestamp, counts)
 * - Shows detailed row-level results in a table
 * - Color-coded status indicators for each row
 * - Error messages for failed rows
 * - Scrollable content for large imports
 * @example
 * ```tsx
 * <ImportHistoryDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   importId="import-id-123"
 * />
 * ```
 */
export function ImportHistoryDialog({
  open,
  onOpenChange,
  importId,
}: ImportHistoryDialogProps) {
  const { data, isLoading } = useImportHistoryDetails(importId);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Details</DialogTitle>
          <DialogDescription>
            {data?.history && (
              <>
                View detailed results for this{" "}
                <span className="font-semibold text-foreground">
                  {data.history.type}
                </span>{" "}
                import.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <LoadingContent />}
        {!isLoading && data && (
          <ImportDetailsContent history={data.history} items={data.items} />
        )}
        {!(isLoading || data) && <EmptyContent />}

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading state component
 */
function LoadingContent() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyContent() {
  return (
    <div className="py-12 text-center text-muted-foreground">
      No import details found.
    </div>
  );
}

/**
 * Props for ImportDetailsContent
 */
interface ImportDetailsContentProps {
  history: {
    id: string;
    type: "users" | "departments";
    userId: string;
    userName: string;
    filename: string | null;
    totalRows: number;
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    upsertMode: boolean;
    createdAt: Date;
  };
  items: ImportHistoryItem[];
}

/**
 * Main content component displaying import details
 */
function ImportDetailsContent({ history, items }: ImportDetailsContentProps) {
  return (
    <div className="space-y-4">
      {/* Import Summary */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Imported by:</span>{" "}
            <span className="font-medium">{history.userName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>{" "}
            <span className="font-medium">
              {format(new Date(history.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          {history.filename && (
            <div>
              <span className="text-muted-foreground">File:</span>{" "}
              <span className="font-medium">{history.filename}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Mode:</span>{" "}
            <Badge variant="outline">
              {history.upsertMode ? "Upsert" : "Insert Only"}
            </Badge>
          </div>
        </div>

        {/* Counts Summary */}
        <div className="mt-4 flex flex-wrap gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Total:</span>
            <span className="font-semibold">{history.totalRows}</span>
          </div>
          {history.insertedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-sm">Inserted:</span>
              <span className="font-semibold text-green-600">
                {history.insertedCount}
              </span>
            </div>
          )}
          {history.updatedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-sm">Updated:</span>
              <span className="font-semibold text-blue-600">
                {history.updatedCount}
              </span>
            </div>
          )}
          {history.skippedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-yellow-600">Skipped:</span>
              <span className="font-semibold text-yellow-600">
                {history.skippedCount}
              </span>
            </div>
          )}
          {history.failedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-sm">Failed:</span>
              <span className="font-semibold text-red-600">
                {history.failedCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Row Details</h4>
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Row</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.rowNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.identifier}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      {item.errorMessage ? (
                        <span className="text-red-600 text-sm">
                          {item.errorMessage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

/**
 * Props for StatusBadge component
 */
interface StatusBadgeProps {
  status: "inserted" | "updated" | "skipped" | "failed";
}

/**
 * Status badge component with icon and color coding
 */
function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    inserted: {
      label: "Inserted",
      icon: CheckCircle2,
      className:
        "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    },
    updated: {
      label: "Updated",
      icon: CheckCircle2,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    },
    skipped: {
      label: "Skipped",
      icon: AlertCircle,
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    },
    failed: {
      label: "Failed",
      icon: XCircle,
      className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge
      className={cn("flex items-center gap-1", className)}
      variant="secondary"
    >
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
