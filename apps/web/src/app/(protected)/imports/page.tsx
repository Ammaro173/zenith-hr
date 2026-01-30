"use client";

import { useState } from "react";
import { ImportHistoryComponent } from "./_components/import-history";
import { ImportHistoryDialog } from "./_components/import-history-dialog";
import { ImportTabs } from "./_components/import-tabs";

/**
 * Imports Page
 *
 * Main page for bulk importing users and departments from CSV files.
 * Features:
 * - Tabbed interface for Users and Departments imports
 * - Complete import workflow with file upload, column mapping, validation, and progress tracking
 * - Import history tracking with detailed results
 *
 */
export default function ImportsPage() {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );

  const handleViewHistoryDetails = (historyId: string) => {
    setSelectedHistoryId(historyId);
  };

  const handleCloseHistoryDialog = () => {
    setSelectedHistoryId(null);
  };

  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      {/* Page Header */}
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Imports
        </h1>
        <p className="mt-1 text-muted-foreground">
          Import users and departments from CSV files with validation and
          progress tracking.
        </p>
      </div>

      {/* Import Tabs */}
      <ImportTabs defaultTab="users" />

      {/* Import History */}
      <ImportHistoryComponent
        limit={10}
        onViewDetails={handleViewHistoryDetails}
      />

      {/* Import History Details Dialog */}
      {selectedHistoryId && (
        <ImportHistoryDialog
          importId={selectedHistoryId}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseHistoryDialog();
            }
          }}
          open={!!selectedHistoryId}
        />
      )}
    </div>
  );
}
