import { useMutation } from "@tanstack/react-query";
import type {
  DepartmentImportRow,
  RowValidationResult,
  UserImportRow,
} from "@/types/imports";
import { client } from "@/utils/orpc";

/**
 * Input type for user validation mutation
 */
interface ValidateUsersInput {
  rows: UserImportRow[];
  upsertMode: boolean;
}

/**
 * Input type for department validation mutation
 */
interface ValidateDepartmentsInput {
  rows: DepartmentImportRow[];
  upsertMode: boolean;
}

/**
 * Return type for the useImportValidation hook
 */
export interface UseImportValidationReturn {
  validateUsers: ReturnType<typeof useValidateUsersMutation>;
  validateDepartments: ReturnType<typeof useValidateDepartmentsMutation>;
}

/**
 * Hook for validating user import rows.
 * Calls the validateUsers API endpoint.
 */
function useValidateUsersMutation() {
  return useMutation({
    mutationFn: async ({
      rows,
      upsertMode,
    }: ValidateUsersInput): Promise<RowValidationResult[]> => {
      const results = await client.imports.validateUsers({ rows, upsertMode });
      return results;
    },
  });
}

/**
 * Hook for validating department import rows.
 * Calls the validateDepartments API endpoint.
 */
function useValidateDepartmentsMutation() {
  return useMutation({
    mutationFn: async ({
      rows,
      upsertMode,
    }: ValidateDepartmentsInput): Promise<RowValidationResult[]> => {
      const results = await client.imports.validateDepartments({
        rows,
        upsertMode,
      });
      return results;
    },
  });
}

/**
 * Hook for validating import data before performing the actual import.
 *
 * Provides mutations for validating both user and department import rows
 * against the backend validation rules.
 *
 * Features:
 * - Validates each row against schema rules
 * - Checks required fields, email format, role/status enum values
 * - Validates foreign key references (departmentId, reportsToManagerId, headOfDepartmentId)
 * - Returns validation results with row index, isValid, errors, and willUpdate flag
 *
 * @returns Object containing validateUsers and validateDepartments mutations
 *
 * @example
 * ```tsx
 * const { validateUsers, validateDepartments } = useImportValidation();
 *
 * // Validate user rows
 * const handleValidateUsers = async () => {
 *   const results = await validateUsers.mutateAsync({
 *     rows: userRows,
 *     upsertMode: true,
 *   });
 *   // Process validation results
 * };
 *
 * // Validate department rows
 * const handleValidateDepartments = async () => {
 *   const results = await validateDepartments.mutateAsync({
 *     rows: departmentRows,
 *     upsertMode: false,
 *   });
 *   // Process validation results
 * };
 * ```
 */
export function useImportValidation(): UseImportValidationReturn {
  const validateUsers = useValidateUsersMutation();
  const validateDepartments = useValidateDepartmentsMutation();

  return {
    validateUsers,
    validateDepartments,
  };
}
