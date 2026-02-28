"use client";

import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result for a single row
 */
export interface ValidationResult {
  errors: ValidationError[];
  isValid: boolean;
  rowIndex: number;
  willUpdate?: boolean;
}

/**
 * User import row for validation
 */
export interface UserImportRow {
  departmentId?: string | null;
  email: string;
  name: string;
  password?: string;
  positionId?: string | null;
  role:
    | "EMPLOYEE"
    | "MANAGER"
    | "HOD"
    | "HOD_HR"
    | "HOD_FINANCE"
    | "HOD_IT"
    | "CEO"
    | "ADMIN";
  sapNo: string;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}

/**
 * Department import row for validation
 */
export interface DepartmentImportRow {
  name: string;
}

/**
 * Hook for validating user import rows before import.
 *
 * Calls the validateUsers API endpoint to validate each row against
 * schema rules and database constraints (e.g., foreign key validation).
 *
 * @returns Mutation for validating user rows
 *
 * @example
 * ```tsx
 * const validateUsers = useValidateUsers();
 *
 * const handleValidate = async () => {
 *   const results = await validateUsers.mutateAsync({
 *     rows: parsedRows,
 *     upsertMode: true,
 *   });
 *   console.log('Validation results:', results);
 * };
 * ```
 */
export function useValidateUsers() {
  return useMutation({
    mutationFn: async (input: {
      rows: UserImportRow[];
      upsertMode?: boolean;
    }) => {
      const result = await orpc.imports.validateUsers.call({
        rows: input.rows,
        upsertMode: input.upsertMode ?? false,
      });
      return result as ValidationResult[];
    },
  });
}

/**
 * Hook for validating department import rows before import.
 *
 * Calls the validateDepartments API endpoint to validate each row against
 * schema rules and database constraints.
 *
 * @returns Mutation for validating department rows
 *
 * @example
 * ```tsx
 * const validateDepartments = useValidateDepartments();
 *
 * const handleValidate = async () => {
 *   const results = await validateDepartments.mutateAsync({
 *     rows: parsedRows,
 *     upsertMode: false,
 *   });
 *   console.log('Validation results:', results);
 * };
 * ```
 */
export function useValidateDepartments() {
  return useMutation({
    mutationFn: async (input: {
      rows: DepartmentImportRow[];
      upsertMode?: boolean;
    }) => {
      const result = await orpc.imports.validateDepartments.call({
        rows: input.rows,
        upsertMode: input.upsertMode ?? false,
      });
      return result as ValidationResult[];
    },
  });
}

/**
 * Combined hook for import validation.
 *
 * Returns both user and department validation mutations for convenience.
 *
 * @returns Object containing validateUsers and validateDepartments mutations
 */
export function useImportValidation() {
  const validateUsers = useValidateUsers();
  const validateDepartments = useValidateDepartments();

  return {
    validateUsers,
    validateDepartments,
  };
}
