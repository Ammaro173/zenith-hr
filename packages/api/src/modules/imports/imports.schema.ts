import { z } from "zod";

// ============================================
// User Import Schemas
// ============================================

/**
 * User import row schema - validates individual user rows from CSV
 */
export const userImportRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  sapNo: z.string().min(1, "SAP number is required"),
  role: z.enum([
    "EMPLOYEE",
    "MANAGER",
    "HOD",
    "HOD_HR",
    "HOD_FINANCE",
    "CEO",
    "HOD_IT",
    "ADMIN",
  ]),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  password: z.string().min(8).optional(), // Optional - will be generated if not provided
});

export type UserImportRow = z.infer<typeof userImportRowSchema>;

/**
 * Import users input schema - wraps rows with import options
 */
export const importUsersInputSchema = z.object({
  rows: z.array(userImportRowSchema),
  upsertMode: z.boolean().default(false),
  skipInvalid: z.boolean().default(false),
});

export type ImportUsersInput = z.infer<typeof importUsersInputSchema>;

/**
 * Validate users input schema - for pre-import validation
 */
export const validateUsersInputSchema = z.object({
  rows: z.array(userImportRowSchema),
  upsertMode: z.boolean().default(false),
});

export type ValidateUsersInput = z.infer<typeof validateUsersInputSchema>;

// ============================================
// Department Import Schemas
// ============================================

/**
 * Department import row schema - validates individual department rows from CSV
 */
export const departmentImportRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type DepartmentImportRow = z.infer<typeof departmentImportRowSchema>;

/**
 * Import departments input schema - wraps rows with import options
 */
export const importDepartmentsInputSchema = z.object({
  rows: z.array(departmentImportRowSchema),
  upsertMode: z.boolean().default(false),
  skipInvalid: z.boolean().default(false),
});

export type ImportDepartmentsInput = z.infer<
  typeof importDepartmentsInputSchema
>;

/**
 * Validate departments input schema - for pre-import validation
 */
export const validateDepartmentsInputSchema = z.object({
  rows: z.array(departmentImportRowSchema),
  upsertMode: z.boolean().default(false),
});

export type ValidateDepartmentsInput = z.infer<
  typeof validateDepartmentsInputSchema
>;

// ============================================
// Validation Result Schemas
// ============================================

/**
 * Validation error schema - describes a single field error
 */
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

/**
 * Validation result schema - result for a single row validation
 */
export const validationResultSchema = z.object({
  rowIndex: z.number(),
  isValid: z.boolean(),
  errors: z.array(validationErrorSchema),
  willUpdate: z.boolean().optional(), // True if record exists and upsert mode
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// ============================================
// Import Result Schemas
// ============================================

/**
 * Import result item schema - result for a single row import
 */
export const importResultItemSchema = z.object({
  identifier: z.string(),
  status: z.enum(["inserted", "updated", "skipped", "failed"]),
  errorMessage: z.string().optional(),
});

export type ImportResultItem = z.infer<typeof importResultItemSchema>;

/**
 * Import summary schema - aggregated counts
 */
export const importSummarySchema = z.object({
  total: z.number(),
  inserted: z.number(),
  updated: z.number(),
  skipped: z.number(),
  failed: z.number(),
});

export type ImportSummary = z.infer<typeof importSummarySchema>;

/**
 * Import result schema - complete result of an import operation
 */
export const importResultSchema = z.object({
  results: z.array(importResultItemSchema),
  generatedPasswords: z.record(z.string(), z.string()).optional(),
  historyId: z.string().uuid(),
  summary: importSummarySchema,
});

export type ImportResult = z.infer<typeof importResultSchema>;

// ============================================
// Import History Schemas
// ============================================

/**
 * Import history schema - represents a past import operation
 */
export const importHistorySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["users", "departments"]),
  userId: z.string(),
  userName: z.string(),
  filename: z.string().nullable(),
  totalRows: z.number(),
  insertedCount: z.number(),
  updatedCount: z.number(),
  skippedCount: z.number(),
  failedCount: z.number(),
  upsertMode: z.boolean(),
  createdAt: z.date(),
});

export type ImportHistory = z.infer<typeof importHistorySchema>;

/**
 * Import history item schema - represents a single row result in history
 */
export const importHistoryItemSchema = z.object({
  id: z.string().uuid(),
  importHistoryId: z.string().uuid(),
  rowNumber: z.number(),
  identifier: z.string(),
  status: z.enum(["inserted", "updated", "skipped", "failed"]),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
});

export type ImportHistoryItem = z.infer<typeof importHistoryItemSchema>;

/**
 * Import history details schema - history with all row items
 */
export const importHistoryDetailsSchema = z.object({
  history: importHistorySchema,
  items: z.array(importHistoryItemSchema),
});

export type ImportHistoryDetails = z.infer<typeof importHistoryDetailsSchema>;

/**
 * Get history input schema - for querying import history
 */
export const getHistoryInputSchema = z.object({
  type: z.enum(["users", "departments"]).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export type GetHistoryInput = z.infer<typeof getHistoryInputSchema>;

/**
 * Get history details input schema
 */
export const getHistoryDetailsInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetHistoryDetailsInput = z.infer<
  typeof getHistoryDetailsInputSchema
>;
