import { useMutation } from "@tanstack/react-query";
import type {
  DepartmentImportRow,
  ImportSummary,
  UserImportRow,
} from "@/types/imports";
import { client } from "@/utils/orpc";

/**
 * Input type for user import mutation
 */
interface ImportUsersInput {
  rows: UserImportRow[];
  upsertMode: boolean;
  skipInvalid: boolean;
}

/**
 * Input type for department import mutation
 */
interface ImportDepartmentsInput {
  rows: DepartmentImportRow[];
  upsertMode: boolean;
  skipInvalid: boolean;
}

/**
 * Result item for a single imported row
 */
export interface ImportResultItem {
  identifier: string;
  status: "inserted" | "updated" | "skipped" | "failed";
  errorMessage?: string;
}

/**
 * Complete result of an import operation
 */
export interface ImportResult {
  results: ImportResultItem[];
  generatedPasswords?: Record<string, string>;
  historyId: string;
  summary: ImportSummary;
}

/**
 * Return type for the useImportMutation hook
 */
export interface UseImportMutationReturn {
  importUsers: ReturnType<typeof useImportUsersMutation>;
  importDepartments: ReturnType<typeof useImportDepartmentsMutation>;
}

/**
 * Hook for importing user rows.
 * Calls the importUsers API endpoint.
 *
 * Requirements: 6.1, 6.2, 6.3, 8.2, 8.3
 */
function useImportUsersMutation() {
  return useMutation({
    mutationFn: async ({
      rows,
      upsertMode,
      skipInvalid,
    }: ImportUsersInput): Promise<ImportResult> => {
      const result = await client.imports.importUsers({
        rows,
        upsertMode,
        skipInvalid,
      });
      return result;
    },
  });
}

/**
 * Hook for importing department rows.
 * Calls the importDepartments API endpoint.
 *
 * Requirements: 6.1, 6.2, 6.3, 8.2, 8.3
 */
function useImportDepartmentsMutation() {
  return useMutation({
    mutationFn: async ({
      rows,
      upsertMode,
      skipInvalid,
    }: ImportDepartmentsInput): Promise<ImportResult> => {
      const result = await client.imports.importDepartments({
        rows,
        upsertMode,
        skipInvalid,
      });
      return result;
    },
  });
}

/**
 * Hook for performing bulk import operations for users and departments.
 *
 * Provides mutations for importing validated user and department rows
 * to the backend, with support for upsert mode and error handling.
 *
 * Features:
 * - Imports user rows with password generation and hashing
 * - Imports department rows
 * - Supports upsert mode (update existing records)
 * - Supports skipInvalid mode (skip invalid rows instead of failing)
 * - Returns import results with generated passwords for new users
 * - Creates import history records
 * - Returns summary with counts of inserted, updated, skipped, and failed records
 *
 * Requirements: 6.1, 6.2, 6.3, 8.2, 8.3
 *
 * @returns Object containing importUsers and importDepartments mutations
 *
 * @example
 * ```tsx
 * const { importUsers, importDepartments } = useImportMutation();
 *
 * // Import user rows
 * const handleImportUsers = async () => {
 *   const result = await importUsers.mutateAsync({
 *     rows: userRows,
 *     upsertMode: true,
 *     skipInvalid: false,
 *   });
 *
 *   console.log('Import summary:', result.summary);
 *   console.log('Generated passwords:', result.generatedPasswords);
 *   console.log('History ID:', result.historyId);
 * };
 *
 * // Import department rows
 * const handleImportDepartments = async () => {
 *   const result = await importDepartments.mutateAsync({
 *     rows: departmentRows,
 *     upsertMode: false,
 *     skipInvalid: true,
 *   });
 *
 *   console.log('Import summary:', result.summary);
 * };
 * ```
 */
export function useImportMutation(): UseImportMutationReturn {
  const importUsers = useImportUsersMutation();
  const importDepartments = useImportDepartmentsMutation();

  return {
    importUsers,
    importDepartments,
  };
}
