"use client";

import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { ImportResult } from "../_hooks/use-import-mutation";

/**
 * Props for the ImportResultsDialog component
 */
interface ImportResultsDialogProps {
  /**
   * The type of import (users or departments)
   */
  importType: "users" | "departments";
  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * The import result data to display
   */
  result: ImportResult | null;
}

/**
 * Export import results to CSV file
 *
 * Creates a CSV file containing:
 * - Original identifier (email for users, name for departments)
 * - Import status (inserted, updated, skipped, failed)
 * - Generated password (for new users only)
 * - Error message (for failed rows)
 */
function exportResultsToCSV(
  result: ImportResult,
  importType: "users" | "departments",
): void {
  const headers = ["Identifier", "Status", "Password", "Error Message"];
  const rows = result.results.map((item) => {
    const password =
      result.generatedPasswords?.[item.identifier] || "N/A (existing user)";
    const errorMessage = item.errorMessage || "";

    return [
      escapeCSVValue(item.identifier),
      escapeCSVValue(item.status),
      escapeCSVValue(password),
      escapeCSVValue(errorMessage),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `import-results-${importType}-${timestamp}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV value by wrapping in quotes and escaping internal quotes
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Import Results Dialog Component
 *
 * Displays the results of an import operation including:
 * - Summary counts (inserted, updated, skipped, failed)
 * - Generated passwords for new users
 * - Export to CSV functionality with security warning
 *
 * Features:
 * - Color-coded summary statistics
 * - Table showing generated passwords for new users
 * - Security warning before exporting passwords
 * - Export button to download results as CSV
 *
 * @example
 * ```tsx
 * <ImportResultsDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   result={importResult}
 *   importType="users"
 * />
 * ```
 */
export function ImportResultsDialog({
  open,
  onOpenChange,
  result,
  importType,
}: ImportResultsDialogProps) {
  const [showExportWarning, setShowExportWarning] = useState(false);

  if (!result) {
    return null;
  }

  const hasGeneratedPasswords =
    result.generatedPasswords &&
    Object.keys(result.generatedPasswords).length > 0;

  const handleExport = () => {
    if (hasGeneratedPasswords && !showExportWarning) {
      setShowExportWarning(true);
      return;
    }

    exportResultsToCSV(result, importType);
    setShowExportWarning(false);
  };

  const handleClose = () => {
    setShowExportWarning(false);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Complete</DialogTitle>
          <DialogDescription>
            Your {importType} import has been processed. Review the results
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Statistics */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-3 font-medium text-sm">Import Summary</h4>
            <div className="flex flex-wrap gap-4">
              <SummaryBadge
                count={result.summary.total}
                icon={null}
                label="Total"
                variant="secondary"
              />
              {result.summary.inserted > 0 && (
                <SummaryBadge
                  count={result.summary.inserted}
                  icon={CheckCircle2}
                  label="Inserted"
                  variant="success"
                />
              )}
              {result.summary.updated > 0 && (
                <SummaryBadge
                  count={result.summary.updated}
                  icon={CheckCircle2}
                  label="Updated"
                  variant="info"
                />
              )}
              {result.summary.skipped > 0 && (
                <SummaryBadge
                  count={result.summary.skipped}
                  icon={AlertTriangle}
                  label="Skipped"
                  variant="warning"
                />
              )}
              {result.summary.failed > 0 && (
                <SummaryBadge
                  count={result.summary.failed}
                  icon={XCircle}
                  label="Failed"
                  variant="destructive"
                />
              )}
            </div>
          </div>

          {/* Generated Passwords Section */}
          {hasGeneratedPasswords && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Generated Passwords for New Users
              </h4>
              <p className="text-muted-foreground text-sm">
                These temporary passwords have been generated for newly created
                users. Please distribute them securely.
              </p>
              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Temporary Password</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.generatedPasswords &&
                      Object.entries(result.generatedPasswords).map(
                        ([email, password]) => (
                          <TableRow key={email}>
                            <TableCell className="font-medium">
                              {email}
                            </TableCell>
                            <TableCell>
                              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                {password}
                              </code>
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Security Warning */}
          {showExportWarning && hasGeneratedPasswords && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Security Warning</AlertTitle>
              <AlertDescription>
                The exported CSV file will contain plain-text passwords. Please
                ensure you store and distribute this file securely. Consider
                deleting the file after passwords have been distributed to
                users.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} type="button" variant="outline">
            Close
          </Button>
          <Button onClick={handleExport} type="button">
            <Download className="mr-2 size-4" />
            {showExportWarning ? "Confirm Export" : "Export to CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Props for SummaryBadge component
 */
interface SummaryBadgeProps {
  count: number;
  icon: React.ComponentType<{ className?: string }> | null;
  label: string;
  variant: "success" | "info" | "warning" | "destructive" | "secondary";
}

/**
 * Summary badge component displaying a count with label and optional icon
 */
function SummaryBadge({
  label,
  count,
  variant,
  icon: Icon,
}: SummaryBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}:</span>
      <Badge
        appearance="light"
        className={cn("flex items-center gap-1", Icon && "pl-1.5")}
        variant={variant}
      >
        {Icon && <Icon className="size-3" />}
        <span className="font-semibold">{count}</span>
      </Badge>
    </div>
  );
}
