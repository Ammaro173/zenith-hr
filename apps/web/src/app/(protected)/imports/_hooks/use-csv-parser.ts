import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import type { ParsedCSVData } from "@/types/imports";
import { parseCSV } from "../_utils/csv-parser";

/** Supported file extensions */
const SUPPORTED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

/** MIME types for supported files */
const SUPPORTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

/**
 * Return type for the useCSVParser hook
 */
export interface UseCSVParserReturn {
  parsedData: ParsedCSVData | null;
  isLoading: boolean;
  error: string | null;
  parseFile: (file: File) => Promise<void>;
  parseText: (text: string, filename?: string) => void;
  reset: () => void;
}

/**
 * Checks if a file is a supported spreadsheet type
 */
function isSupportedFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext),
  );
  const hasValidMimeType = SUPPORTED_MIME_TYPES.some(
    (mime) => file.type === mime,
  );
  return hasValidExtension || hasValidMimeType;
}

/**
 * Checks if a file is an Excel file (xlsx/xls)
 */
function isExcelFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * Parses an Excel file and returns headers and rows
 */
async function parseExcelFile(
  file: File,
): Promise<{ headers: string[]; rows: string[][] }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The Excel file has no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error("Could not read the worksheet.");
  }

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (data.length === 0) {
    return { headers: [], rows: [] };
  }

  // First row is headers, rest are data rows
  const headers = (data[0] ?? []).map((h) => String(h).trim());
  const rows = data
    .slice(1)
    .map((row) => row.map((cell) => String(cell).trim()));

  // Filter out comment rows (rows starting with parenthesis)
  const filteredRows = rows.filter(
    (row) => !(row.length > 0 && row[0]?.startsWith("(")),
  );

  return { headers, rows: filteredRows };
}

/**
 * Hook for parsing CSV/Excel data from files or text input.
 *
 * Handles:
 * - CSV files (.csv)
 * - Excel files (.xlsx, .xls)
 * - Paste event parsing (direct text input - CSV format)
 * - Loading and error states
 */
export function useCSVParser(): UseCSVParserReturn {
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parses a CSV or Excel file by reading its contents.
   * Validates that the file is a supported type before processing.
   */
  const parseFile = useCallback(async (file: File): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);

    try {
      if (!isSupportedFile(file)) {
        throw new Error(
          "Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls).",
        );
      }

      let result: { headers: string[]; rows: string[][] };

      if (isExcelFile(file)) {
        // Parse Excel file
        result = await parseExcelFile(file);
      } else {
        // Parse CSV file
        const text = await file.text();
        result = parseCSV(text);
      }

      // Validate that we got some data
      if (result.headers.length === 0) {
        throw new Error(
          "The file appears to be empty or has no valid headers.",
        );
      }

      setParsedData({
        ...result,
        filename: file.name,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse file";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Parses CSV text directly (e.g., from paste events).
   * Optionally accepts a filename for display purposes.
   */
  const parseText = useCallback((text: string, filename?: string): void => {
    setError(null);
    setParsedData(null);

    try {
      // Handle empty input
      if (!text || text.trim().length === 0) {
        throw new Error(
          "No CSV content provided. Please paste valid CSV data.",
        );
      }

      // Parse the CSV content
      const result = parseCSV(text);

      // Validate that we got some data
      if (result.headers.length === 0) {
        throw new Error(
          "The pasted content appears to be empty or has no valid headers.",
        );
      }

      setParsedData({
        ...result,
        filename: filename ?? "Pasted content",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse CSV content";
      setError(message);
    }
  }, []);

  /**
   * Resets all state to initial values.
   */
  const reset = useCallback((): void => {
    setParsedData(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    parsedData,
    isLoading,
    error,
    parseFile,
    parseText,
    reset,
  };
}
