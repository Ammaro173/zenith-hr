import type { UserRole, UserStatus } from "./users";

/**
 * Represents parsed CSV data with headers and rows
 */
export interface ParsedCSVData {
  filename?: string;
  headers: string[];
  rows: string[][];
}

/**
 * Maps CSV column names to expected field names
 */
export interface ColumnMapping {
  [csvColumn: string]: string;
}

/**
 * Represents a single user row for import
 */
export interface UserImportRow {
  departmentId?: string | null;
  email: string;
  name: string;
  password?: string;
  positionId?: string | null;
  role: UserRole;
  sapNo: string;
  status?: UserStatus;
}

/**
 * Represents a single department row for import
 */
export interface DepartmentImportRow {
  name: string;
}

/**
 * Represents a validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Represents the validation result for a single row
 */
export interface RowValidationResult {
  errors: ValidationError[];
  isValid: boolean;
  rowIndex: number;
  willUpdate?: boolean;
}

/**
 * Summary of an import operation
 */
export interface ImportSummary {
  failed: number;
  inserted: number;
  skipped: number;
  total: number;
  updated: number;
}
