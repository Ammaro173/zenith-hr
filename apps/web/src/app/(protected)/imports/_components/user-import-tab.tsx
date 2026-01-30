"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperNextTrigger,
  StepperPrevTrigger,
  Stepper as StepperRoot,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { UserImportRow } from "@/types/imports";
import { USER_FIELD_DEFINITIONS } from "../_constants/field-definitions";
import { useColumnMapping } from "../_hooks/use-column-mapping";
import { useCSVParser } from "../_hooks/use-csv-parser";
import { useImportMutation } from "../_hooks/use-import-mutation";
import { useImportValidation } from "../_hooks/use-import-validation";
import { ColumnMapping } from "./column-mapping";
import {
  type UserImportPreviewRow,
  userPreviewColumns,
} from "./columns/user-preview-columns";
import { DataPreviewTable } from "./data-preview-table";
import { ImportProgress, type ImportStatus } from "./import-progress";
import { ImportResultsDialog } from "./import-results-dialog";
import { TemplateDownload } from "./template-download";

/**
 * Step IDs for the import flow
 */
const STEPS = {
  UPLOAD: "upload",
  MAP: "map",
  PREVIEW: "preview",
  IMPORT: "import",
} as const;

type StepId = (typeof STEPS)[keyof typeof STEPS];

/**
 * User Import Tab Component
 *
 * Provides a complete import flow for users with the following steps:
 * 1. Upload - File upload or paste CSV content
 * 2. Map Columns - Map CSV columns to expected fields
 * 3. Preview - Preview data with validation
 * 4. Import - Execute import and show results
 *
 * Features:
 * - Stepper UI for guided workflow
 * - File upload via drag & drop or file picker
 * - Paste CSV content support
 * - Auto-detect column mappings
 * - Real-time validation
 * - Upsert mode toggle
 * - Progress tracking
 * - Results dialog with password export
 */
export function UserImportTab() {
  // State
  const [currentStep, setCurrentStep] = useState<StepId>(STEPS.UPLOAD);
  const [upsertMode, setUpsertMode] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [showResults, setShowResults] = useState(false);
  const [pastedText, setPastedText] = useState("");

  // Hooks
  const csvParser = useCSVParser();
  const columnMapping = useColumnMapping("users");
  const validation = useImportValidation();
  const importMutation = useImportMutation();

  // Auto-detect columns when CSV data is loaded
  useEffect(() => {
    if (csvParser.parsedData) {
      columnMapping.autoDetect(csvParser.parsedData.headers, "users");
    }
  }, [csvParser.parsedData, columnMapping.autoDetect]);

  // Transform parsed CSV data to user import rows
  const userRows = useMemo((): UserImportRow[] => {
    if (!(csvParser.parsedData && columnMapping.isValid)) {
      return [];
    }

    const { headers, rows } = csvParser.parsedData;
    const { mapping } = columnMapping;

    return rows.map((row) => {
      const userRow: Partial<UserImportRow> = {};

      for (const [csvColumn, fieldKey] of Object.entries(mapping)) {
        const columnIndex = headers.indexOf(csvColumn);
        if (columnIndex === -1) {
          continue;
        }

        const value = row[columnIndex]?.trim() ?? "";

        // Map the value to the appropriate field
        switch (fieldKey) {
          case "name":
          case "email":
          case "sapNo":
            userRow[fieldKey] = value;
            break;
          case "role":
            userRow[fieldKey] = value as UserImportRow["role"];
            break;
          case "status":
            userRow[fieldKey] = (value || undefined) as UserImportRow["status"];
            break;
          case "password":
            userRow[fieldKey] = value || undefined;
            break;
          case "departmentId":
          case "reportsToManagerId":
            userRow[fieldKey] = value || null;
            break;
          default:
            // Unknown field, skip
            break;
        }
      }

      // Ensure required fields have at least empty strings to satisfy the type
      return {
        name: userRow.name ?? "",
        email: userRow.email ?? "",
        sapNo: userRow.sapNo ?? "",
        role: userRow.role ?? "REQUESTER",
        status: userRow.status,
        departmentId: userRow.departmentId,
        reportsToManagerId: userRow.reportsToManagerId,
        password: userRow.password,
      } as UserImportRow;
    });
  }, [csvParser.parsedData, columnMapping]);

  // Prepare data for preview table
  const previewData = useMemo((): UserImportPreviewRow[] => {
    return userRows.map((row, index) => ({
      ...row,
      rowIndex: index,
    }));
  }, [userRows]);

  // Validation results
  const validationResults = validation.validateUsers.data ?? [];

  // Can advance to next step
  const canAdvanceFromUpload = !!csvParser.parsedData && !csvParser.error;
  const canAdvanceFromMap = columnMapping.isValid;
  const canAdvanceFromPreview =
    validationResults.length > 0 &&
    validationResults.some((result) => result.isValid);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const file = files[0];
      if (!file) {
        return;
      }

      await csvParser.parseFile(file);
    },
    [csvParser],
  );

  // Handle paste
  const handlePaste = useCallback(() => {
    if (!pastedText.trim()) {
      return;
    }

    csvParser.parseText(pastedText);
    setPastedText("");
  }, [pastedText, csvParser]);

  // Handle validation
  const handleValidate = useCallback(async () => {
    if (userRows.length === 0) {
      return;
    }

    setImportStatus("validating");

    try {
      await validation.validateUsers.mutateAsync({
        rows: userRows,
        upsertMode,
      });
      setImportStatus("idle");
    } catch (error) {
      setImportStatus("error");
      console.error("Validation failed:", error);
    }
  }, [userRows, upsertMode, validation.validateUsers.mutateAsync]);

  // Trigger validation when entering preview step
  // biome-ignore lint/correctness/useExhaustiveDependencies: Needed
  useEffect(() => {
    if (currentStep === STEPS.PREVIEW && validationResults.length === 0) {
      handleValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, validationResults.length]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (userRows.length === 0) {
      return;
    }

    setImportStatus("importing");

    try {
      await importMutation.importUsers.mutateAsync({
        rows: userRows,
        upsertMode,
        skipInvalid: true,
      });

      setImportStatus("complete");
      setShowResults(true);
    } catch (error) {
      setImportStatus("error");
      console.error("Import failed:", error);
    }
  }, [userRows, upsertMode, importMutation.importUsers]);

  // Handle cancel import
  const handleCancelImport = useCallback(() => {
    setImportStatus("cancelled");
  }, []);

  // Reset flow
  const handleReset = useCallback(() => {
    csvParser.reset();
    columnMapping.reset();
    validation.validateUsers.reset();
    importMutation.importUsers.reset();
    setCurrentStep(STEPS.UPLOAD);
    setImportStatus("idle");
    setShowResults(false);
    setPastedText("");
  }, [
    csvParser,
    columnMapping,
    validation.validateUsers,
    importMutation.importUsers,
  ]);

  // Stepper validation
  const handleStepValidate = useCallback(
    (nextValue: string, direction: "next" | "prev") => {
      if (direction === "prev") {
        return true;
      }

      // Validate based on current step
      if (currentStep === STEPS.UPLOAD && nextValue === STEPS.MAP) {
        return canAdvanceFromUpload;
      }

      if (currentStep === STEPS.MAP && nextValue === STEPS.PREVIEW) {
        return canAdvanceFromMap;
      }

      if (currentStep === STEPS.PREVIEW && nextValue === STEPS.IMPORT) {
        return canAdvanceFromPreview;
      }

      return true;
    },
    [
      currentStep,
      canAdvanceFromUpload,
      canAdvanceFromMap,
      canAdvanceFromPreview,
    ],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-2xl">Import Users</h2>
        <p className="text-muted-foreground text-sm">
          Upload a CSV file or paste CSV content to import users in bulk
        </p>
      </div>

      {/* Template Download */}
      <TemplateDownload />

      {/* Upsert Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="upsert-mode">Upsert Mode</Label>
              <p className="text-muted-foreground text-sm">
                Update existing users if they already exist (matched by email)
              </p>
            </div>
            <Switch
              checked={upsertMode}
              id="upsert-mode"
              onCheckedChange={setUpsertMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stepper */}
      <StepperRoot
        onValidate={handleStepValidate}
        onValueChange={(value) => setCurrentStep(value as StepId)}
        value={currentStep}
      >
        <StepperList className="mb-8 flex w-full items-center">
          <StepperItem value={STEPS.UPLOAD}>
            <StepperTrigger className="flex flex-col items-center gap-2">
              <StepperIndicator />
              <StepperTitle>Upload</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>

          <StepperItem value={STEPS.MAP}>
            <StepperTrigger className="flex flex-col items-center gap-2">
              <StepperIndicator />
              <StepperTitle>Map Columns</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>

          <StepperItem value={STEPS.PREVIEW}>
            <StepperTrigger className="flex flex-col items-center gap-2">
              <StepperIndicator />
              <StepperTitle>Preview</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>

          <StepperItem value={STEPS.IMPORT}>
            <StepperTrigger className="flex flex-col items-center gap-2">
              <StepperIndicator />
              <StepperTitle>Import</StepperTitle>
            </StepperTrigger>
          </StepperItem>
        </StepperList>

        {/* Step 1: Upload */}
        <StepperContent value={STEPS.UPLOAD}>
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload - Simplified for now */}
              <div className="space-y-2">
                <Label>Upload File</Label>
                <div className="flex items-center gap-2">
                  <input
                    accept=".csv"
                    className="flex-1"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      handleFileUpload(files);
                    }}
                    type="file"
                  />
                </div>
                {csvParser.parsedData && (
                  <p className="text-muted-foreground text-sm">
                    Loaded: {csvParser.parsedData.filename} (
                    {csvParser.parsedData.rows.length} rows)
                  </p>
                )}
                {csvParser.error && (
                  <p className="text-destructive text-sm">{csvParser.error}</p>
                )}
              </div>

              {/* Paste CSV */}
              <div className="space-y-2">
                <Label htmlFor="paste-csv">Or Paste CSV Content</Label>
                <Textarea
                  id="paste-csv"
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your CSV content here..."
                  rows={8}
                  value={pastedText}
                />
                <Button
                  disabled={!pastedText.trim()}
                  onClick={handlePaste}
                  size="sm"
                  variant="outline"
                >
                  <Upload className="mr-2 size-4" />
                  Parse CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </StepperContent>

        {/* Step 2: Map Columns */}
        <StepperContent value={STEPS.MAP}>
          {csvParser.parsedData && (
            <ColumnMapping
              expectedFields={USER_FIELD_DEFINITIONS}
              headers={csvParser.parsedData.headers}
              mapping={columnMapping.mapping}
              onMappingChange={columnMapping.updateMapping}
              unmappedRequiredFields={columnMapping.unmappedRequiredFields}
            />
          )}
        </StepperContent>

        {/* Step 3: Preview */}
        <StepperContent value={STEPS.PREVIEW}>
          <Card>
            <CardHeader>
              <CardTitle>Preview & Validate</CardTitle>
              <p className="text-muted-foreground text-sm">
                Review your data before importing. Invalid rows will be
                highlighted.
              </p>
            </CardHeader>
            <CardContent>
              <DataPreviewTable<UserImportPreviewRow>
                columns={
                  userPreviewColumns as ColumnDef<UserImportPreviewRow>[]
                }
                data={previewData}
                isLoading={validation.validateUsers.isPending}
                validationResults={validationResults}
              />
            </CardContent>
          </Card>
        </StepperContent>

        {/* Step 4: Import */}
        <StepperContent value={STEPS.IMPORT}>
          <ImportProgress
            current={(() => {
              if (importStatus === "complete") {
                return userRows.length;
              }
              if (importStatus === "importing") {
                return Math.floor(userRows.length / 2);
              }
              return 0;
            })()}
            errorMessage={
              importMutation.importUsers.error
                ? String(importMutation.importUsers.error)
                : undefined
            }
            onCancel={handleCancelImport}
            status={importStatus}
            summary={importMutation.importUsers.data?.summary}
            total={userRows.length}
          />

          {importStatus === "complete" && (
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={handleReset} variant="outline">
                Import More Users
              </Button>
              <Button onClick={() => setShowResults(true)}>View Results</Button>
            </div>
          )}
        </StepperContent>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <StepperPrevTrigger asChild>
            <Button disabled={currentStep === STEPS.UPLOAD} variant="outline">
              Previous
            </Button>
          </StepperPrevTrigger>

          {currentStep === STEPS.IMPORT ? (
            <Button
              disabled={
                importStatus === "importing" ||
                importStatus === "validating" ||
                !canAdvanceFromPreview
              }
              onClick={handleImport}
            >
              {importStatus === "importing" ? "Importing..." : "Start Import"}
            </Button>
          ) : (
            <StepperNextTrigger asChild>
              <Button
                disabled={
                  (currentStep === STEPS.UPLOAD && !canAdvanceFromUpload) ||
                  (currentStep === STEPS.MAP && !canAdvanceFromMap) ||
                  (currentStep === STEPS.PREVIEW && !canAdvanceFromPreview)
                }
              >
                Next
              </Button>
            </StepperNextTrigger>
          )}
        </div>
      </StepperRoot>

      {/* Results Dialog */}
      <ImportResultsDialog
        importType="users"
        onOpenChange={setShowResults}
        open={showResults}
        result={importMutation.importUsers.data ?? null}
      />
    </div>
  );
}
