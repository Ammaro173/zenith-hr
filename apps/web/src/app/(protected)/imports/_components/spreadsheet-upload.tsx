"use client";

import { FileSpreadsheetIcon, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type InputMethod = "upload" | "paste";

const INPUT_METHOD_OPTIONS: { label: string; value: InputMethod }[] = [
  { label: "Upload File", value: "upload" },
  { label: "Paste CSV", value: "paste" },
];

/** Accepted file types for the upload */
const ACCEPTED_FILE_TYPES =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface SpreadsheetUploadProps {
  /** Callback when a file is selected for upload */
  onFileSelect: (file: File) => Promise<void>;
  /** Callback when CSV text is pasted and parsed */
  onTextParse: (text: string) => void;
  /** Whether a file has been successfully loaded */
  hasData: boolean;
  /** Filename of the loaded file (if any) */
  filename?: string;
  /** Number of rows in the loaded data */
  rowCount?: number;
  /** Error message to display */
  error?: string | null;
  /** Whether the parser is currently loading */
  isLoading?: boolean;
  /** Callback to reset/clear the loaded data */
  onReset?: () => void;
}

/**
 * SpreadsheetUpload Component
 *
 * A polished upload interface for CSV/Excel files with:
 * - Toggle between file upload and paste CSV modes
 * - Drag & drop file upload with visual feedback
 * - File preview with metadata
 * - Support for .csv, .xlsx, .xls files
 */
export function SpreadsheetUpload({
  onFileSelect,
  onTextParse,
  hasData,
  filename,
  rowCount,
  error,
  isLoading,
  onReset,
}: SpreadsheetUploadProps) {
  const [inputMethod, setInputMethod] = useState<InputMethod>("upload");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileAccept = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) {
        return;
      }

      setSelectedFile(file);
      await onFileSelect(file);
    },
    [onFileSelect],
  );

  const handlePaste = useCallback(() => {
    if (!pastedText.trim()) {
      return;
    }
    onTextParse(pastedText);
  }, [pastedText, onTextParse]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPastedText("");
    onReset?.();
  }, [onReset]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Upload Data</CardTitle>
          <SegmentedControl
            onValueChange={setInputMethod}
            options={INPUT_METHOD_OPTIONS}
            value={inputMethod}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inputMethod === "upload" ? (
          <FileUploadSection
            error={error}
            hasData={hasData}
            isLoading={isLoading}
            onClear={handleClear}
            onFileAccept={handleFileAccept}
            selectedFile={selectedFile}
          />
        ) : (
          <PasteSection
            error={error}
            hasData={hasData}
            isLoading={isLoading}
            onClear={handleClear}
            onParse={handlePaste}
            onTextChange={setPastedText}
            text={pastedText}
          />
        )}

        {/* Success state */}
        {hasData && !error && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <FileSpreadsheetIcon className="size-4" />
            <span className="text-sm">
              Loaded: <span className="font-medium">{filename}</span>
              {rowCount !== undefined && (
                <span className="text-muted-foreground">
                  {" "}
                  ({rowCount} rows)
                </span>
              )}
            </span>
            <Button
              className="ml-auto size-6"
              onClick={handleClear}
              size="icon"
              variant="ghost"
            >
              <X className="size-3" />
              <span className="sr-only">Clear</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FileUploadSectionProps {
  onFileAccept: (files: File[]) => Promise<void>;
  selectedFile: File | null;
  hasData: boolean;
  error?: string | null;
  isLoading?: boolean;
  onClear: () => void;
}

function FileUploadSection({
  onFileAccept,
  selectedFile,
  hasData,
  error,
  isLoading,
  onClear,
}: FileUploadSectionProps) {
  return (
    <div className="space-y-3">
      <FileUpload
        accept={ACCEPTED_FILE_TYPES}
        disabled={isLoading || hasData}
        maxFiles={1}
        onAccept={onFileAccept}
        value={selectedFile ? [selectedFile] : []}
      >
        <FileUploadDropzone
          className={cn(
            "min-h-[160px] cursor-pointer",
            error && "border-destructive",
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-muted p-3">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">
                Drop your file here or click to browse
              </p>
              <p className="text-muted-foreground text-xs">
                Supports CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          </div>
        </FileUploadDropzone>

        <FileUploadList>
          {selectedFile && (
            <FileUploadItem
              className={cn(error && "border-destructive bg-destructive/5")}
              value={selectedFile}
            >
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete asChild>
                <Button
                  className="size-7"
                  onClick={onClear}
                  size="icon"
                  variant="ghost"
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </FileUploadItemDelete>
            </FileUploadItem>
          )}
        </FileUploadList>
      </FileUpload>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

interface PasteSectionProps {
  text: string;
  onTextChange: (text: string) => void;
  onParse: () => void;
  hasData: boolean;
  error?: string | null;
  isLoading?: boolean;
  onClear: () => void;
}

function PasteSection({
  text,
  onTextChange,
  onParse,
  hasData,
  error,
  isLoading,
}: PasteSectionProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="paste-csv">Paste CSV Content</Label>
        <Textarea
          className={cn("font-mono text-sm", error && "border-destructive")}
          disabled={isLoading || hasData}
          id="paste-csv"
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="name,email,sapNo,role&#10;John Doe,john@example.com,SAP001,EMPLOYEE&#10;Jane Smith,jane@example.com,SAP002,MANAGER"
          rows={8}
          value={text}
        />
      </div>

      <Button
        disabled={!text.trim() || isLoading || hasData}
        onClick={onParse}
        size="sm"
        variant="outline"
      >
        <FileSpreadsheetIcon className="mr-2 size-4" />
        Parse CSV
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
