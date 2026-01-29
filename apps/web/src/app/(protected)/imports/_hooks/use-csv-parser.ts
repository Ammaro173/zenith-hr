import { useCallback, useState } from "react";
import type { ParsedCSVData } from "@/types/imports";
import { parseCSV } from "../_utils/csv-parser";

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
 * Hook for parsing CSV data from files or text input.
 *
 * Handles:
 * - File reading and parsing
 * - Paste event parsing (direct text input)
 * - Loading and error states
 *
 * Requirements: 1.1, 1.3
 */
export function useCSVParser(): UseCSVParserReturn {
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parses a CSV file by reading its contents and parsing the text.
   * Validates that the file is a CSV before processing.
   */
  const parseFile = useCallback(async (file: File): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);

    try {
      // Validate file type
      const isCSV =
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv") ||
        file.type === "application/vnd.ms-excel";

      if (!isCSV) {
        throw new Error(
          "Invalid file type. Please upload a CSV file (.csv extension).",
        );
      }

      // Read file contents
      const text = await file.text();

      // Parse the CSV content
      const result = parseCSV(text);

      // Validate that we got some data
      if (result.headers.length === 0) {
        throw new Error(
          "The CSV file appears to be empty or has no valid headers.",
        );
      }

      setParsedData({
        ...result,
        filename: file.name,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse CSV file";
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
