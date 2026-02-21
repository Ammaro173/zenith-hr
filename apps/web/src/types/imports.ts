import type { UserRole, UserStatus } from "./users";

/**
 * Represents parsed CSV data with headers and rows
 */
export interface ParsedCSVData {
  headers: string[];
  rows: string[][];
  filename?: string;
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
  name: string;
  email: string;
  sapNo: string;
  role: UserRole;
  status?: UserStatus;
  departmentId?: string | null;
  jobDescriptionId?: string | null;
  password?: string;
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
  rowIndex: number;
  isValid: boolean;
  errors: ValidationError[];
  willUpdate?: boolean;
}

/**
 * Summary of an import operation
 */
export interface ImportSummary {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
}
