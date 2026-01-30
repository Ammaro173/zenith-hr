"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * Parameters for querying import history
 */
interface ImportHistoryParams {
  type?: "users" | "departments";
  limit?: number;
  offset?: number;
}

/**
 * Represents a single import history record
 */
export interface ImportHistory {
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
}

/**
 * Represents a single item in import history details
 */
export interface ImportHistoryItem {
  id: string;
  importHistoryId: string;
  rowNumber: number;
  identifier: string;
  status: "inserted" | "updated" | "skipped" | "failed";
  errorMessage: string | null;
  createdAt: Date;
}

/**
 * Represents detailed results for a specific import
 */
export interface ImportHistoryDetails {
  history: ImportHistory;
  items: ImportHistoryItem[];
}

/**
 * Hook for querying import history.
 *
 * Provides a query for fetching paginated import history with optional
 * filtering by type.
 *
 * Features:
 * - Query import history with optional filtering by type
 * - Pagination support with limit and offset
 * - Returns history in reverse chronological order (most recent first)
 *
 * @param params - Parameters for querying import history
 * @param params.type - Optional filter by import type ('users' or 'departments')
 * @param params.limit - Optional limit for pagination (default: 10)
 * @param params.offset - Optional offset for pagination (default: 0)
 *
 * @returns Query result for import history
 *
 * @example
 * ```tsx
 * const history = useImportHistory({
 *   type: 'users',
 *   limit: 20,
 *   offset: 0,
 * });
 *
 * // Access history data
 * if (history.data) {
 *   console.log('Import history:', history.data);
 * }
 * ```
 */
export function useImportHistory(params: ImportHistoryParams = {}) {
  const { type, limit = 10, offset = 0 } = params;

  return useQuery({
    ...orpc.imports.getHistory.queryOptions({
      input: { type, limit, offset },
    }),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for querying detailed results for a specific import.
 *
 * Provides a query for fetching detailed import results including
 * all row-level results for a specific import operation.
 *
 * Features:
 * - Query detailed results for a specific import by ID
 * - Returns import metadata and all row-level results
 * - Only enabled when an ID is provided
 *
 * @param id - The import history ID to fetch details for
 *
 * @returns Query result for import history details
 *
 * @example
 * ```tsx
 * const details = useImportHistoryDetails('import-id-123');
 *
 * // Access details data
 * if (details.data) {
 *   console.log('Import details:', details.data.history);
 *   console.log('Import items:', details.data.items);
 * }
 * ```
 */
export function useImportHistoryDetails(id: string) {
  return useQuery({
    ...orpc.imports.getHistoryDetails.queryOptions({
      input: { id },
    }),
    enabled: Boolean(id),
  });
}
