"use client";

import type { ColumnDef } from "@tanstack/react-table";
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
import type { DepartmentImportRow } from "@/types/imports";
import { DEPARTMENT_FIELD_DEFINITIONS } from "../_constants/field-definitions";
import { useColumnMapping } from "../_hooks/use-column-mapping";
import { useCSVParser } from "../_hooks/use-csv-parser";
import { useImportMutation } from "../_hooks/use-import-mutation";
import { useImportValidation } from "../_hooks/use-import-validation";
import { ColumnMapping } from "./column-mapping";
import {
  type DepartmentImportPreviewRow,
  departmentPreviewColumns,
} from "./columns/department-preview-columns";
import { DataPreviewTable } from "./data-preview-table";
import { ImportProgress, type ImportStatus } from "./import-progress";
import { ImportResultsDialog } from "./import-results-dialog";
import { SpreadsheetUpload } from "./spreadsheet-upload";
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
 * Department Import Tab Component
 *
 * Provides a complete import flow for departments with the following steps:
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
 * - Results dialog
 */
export function DepartmentImportTab() {
  // State
  const [currentStep, setCurrentStep] = useState<StepId>(STEPS.UPLOAD);
  const [upsertMode, setUpsertMode] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [showResults, setShowResults] = useState(false);

  // Hooks
  const csvParser = useCSVParser();
  const columnMapping = useColumnMapping("departments");
  const validation = useImportValidation();
  const importMutation = useImportMutation();

  // Auto-detect columns when CSV data is loaded
  useEffect(() => {
    if (csvParser.parsedData) {
      columnMapping.autoDetect(csvParser.parsedData.headers, "departments");
    }
  }, [csvParser.parsedData, columnMapping.autoDetect]);

  // Transform parsed CSV data to department import rows
  const departmentRows = useMemo((): DepartmentImportRow[] => {
    if (!(csvParser.parsedData && columnMapping.isValid)) {
      return [];
    }

    const { headers, rows } = csvParser.parsedData;
    const { mapping } = columnMapping;

    return rows.map((row) => {
      const departmentRow: Partial<DepartmentImportRow> = {};

      for (const [csvColumn, fieldKey] of Object.entries(mapping)) {
        const columnIndex = headers.indexOf(csvColumn);
        if (columnIndex === -1) {
          continue;
        }

        const value = row[columnIndex]?.trim() ?? "";

        // Map the value to the appropriate field
        switch (fieldKey) {
          case "name":
            departmentRow[fieldKey] = value;
            break;
          default:
            // Unknown field, skip
            break;
        }
      }

      // Ensure required fields have at least empty strings to satisfy the type
      return {
        name: departmentRow.name ?? "",
      } as DepartmentImportRow;
    });
  }, [csvParser.parsedData, columnMapping]);

  // Prepare data for preview table
  const previewData = useMemo((): DepartmentImportPreviewRow[] => {
    return departmentRows.map((row, index) => ({
      ...row,
      rowIndex: index,
    }));
  }, [departmentRows]);

  // Validation results
  const validationResults = validation.validateDepartments.data ?? [];

  // Can advance to next step
  const canAdvanceFromUpload = !!csvParser.parsedData && !csvParser.error;
  const canAdvanceFromMap = columnMapping.isValid;
  const canAdvanceFromPreview =
    validationResults.length > 0 &&
    validationResults.some((result) => result.isValid);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      await csvParser.parseFile(file);
    },
    [csvParser],
  );

  // Handle paste
  const handleTextParse = useCallback(
    (text: string) => {
      csvParser.parseText(text);
    },
    [csvParser],
  );

  // Handle validation
  const handleValidate = useCallback(async () => {
    if (departmentRows.length === 0) {
      return;
    }

    setImportStatus("validating");

    try {
      await validation.validateDepartments.mutateAsync({
        rows: departmentRows,
        upsertMode,
      });
      setImportStatus("idle");
    } catch (error) {
      setImportStatus("error");
      console.error("Validation failed:", error);
    }
  }, [departmentRows, upsertMode, validation.validateDepartments.mutateAsync]);

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
    if (departmentRows.length === 0) {
      return;
    }

    setImportStatus("importing");

    try {
      await importMutation.importDepartments.mutateAsync({
        rows: departmentRows,
        upsertMode,
        skipInvalid: true,
      });

      setImportStatus("complete");
      setShowResults(true);
    } catch (error) {
      setImportStatus("error");
      console.error("Import failed:", error);
    }
  }, [departmentRows, upsertMode, importMutation.importDepartments]);

  // Handle cancel import
  const handleCancelImport = useCallback(() => {
    setImportStatus("cancelled");
  }, []);

  // Reset flow
  const handleReset = useCallback(() => {
    csvParser.reset();
    columnMapping.reset();
    validation.validateDepartments.reset();
    importMutation.importDepartments.reset();
    setCurrentStep(STEPS.UPLOAD);
    setImportStatus("idle");
    setShowResults(false);
  }, [
    csvParser,
    columnMapping,
    validation.validateDepartments,
    importMutation.importDepartments,
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
        <h2 className="font-semibold text-2xl">Import Departments</h2>
        <p className="text-muted-foreground text-sm">
          Upload a CSV file or paste CSV content to import departments in bulk
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
                Update existing departments if they already exist (matched by
                name)
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
          <SpreadsheetUpload
            error={csvParser.error}
            filename={csvParser.parsedData?.filename}
            hasData={!!csvParser.parsedData}
            isLoading={csvParser.isLoading}
            onFileSelect={handleFileUpload}
            onReset={csvParser.reset}
            onTextParse={handleTextParse}
            rowCount={csvParser.parsedData?.rows.length}
          />
        </StepperContent>

        {/* Step 2: Map Columns */}
        <StepperContent value={STEPS.MAP}>
          {csvParser.parsedData && (
            <ColumnMapping
              expectedFields={DEPARTMENT_FIELD_DEFINITIONS}
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
              <DataPreviewTable<DepartmentImportPreviewRow>
                columns={
                  departmentPreviewColumns as ColumnDef<DepartmentImportPreviewRow>[]
                }
                data={previewData}
                isLoading={validation.validateDepartments.isPending}
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
                return departmentRows.length;
              }
              if (importStatus === "importing") {
                return Math.floor(departmentRows.length / 2);
              }
              return 0;
            })()}
            errorMessage={
              importMutation.importDepartments.error
                ? String(importMutation.importDepartments.error)
                : undefined
            }
            onCancel={handleCancelImport}
            status={importStatus}
            summary={importMutation.importDepartments.data?.summary}
            total={departmentRows.length}
          />

          {importStatus === "complete" && (
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={handleReset} variant="outline">
                Import More Departments
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
        importType="departments"
        onOpenChange={setShowResults}
        open={showResults}
        result={importMutation.importDepartments.data ?? null}
      />
    </div>
  );
}
