"use client";

import { ImportTabs } from "./_components/import-tabs";

/**
 * Imports Page
 *
 * Main page for bulk importing users and departments via CSV.
 * Uses a tabbed interface with stepper workflow for each import type.
 *
 * Features:
 * - User import with column mapping, validation, and preview
 * - Department import with column mapping, validation, and preview
 * - Import history tracking
 * - Template downloads
 */
export default function ImportsPage() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-bold text-3xl">Bulk Import</h1>
        <p className="text-muted-foreground">
          Import users and departments from CSV files with validation and
          preview.
        </p>
      </div>

      <ImportTabs />
    </div>
  );
}
