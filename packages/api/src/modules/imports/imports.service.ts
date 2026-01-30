import { randomUUID } from "node:crypto";
import { hashPassword } from "@zenith-hr/auth";
import { db as defaultDb } from "@zenith-hr/db";
import {
  account,
  department,
  importHistory,
  importHistoryItem,
  user,
} from "@zenith-hr/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import {
  type DepartmentImportRow,
  departmentImportRowSchema,
  type GetHistoryInput,
  type ImportDepartmentsInput,
  type ImportHistory,
  type ImportHistoryDetails,
  type ImportResult,
  type ImportResultItem,
  type ImportUsersInput,
  type UserImportRow,
  userImportRowSchema,
  type ValidationError,
  type ValidationResult,
} from "./imports.schema";

type UserInsert = typeof user.$inferInsert;

/**
 * Generates a secure password with at least 12 characters,
 * including uppercase, lowercase, numbers, and symbols.
 */
function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one character from each category
  const password: string[] = [];

  // Add one from each required category
  password.push(uppercase[Math.floor(Math.random() * uppercase.length)] ?? "A");
  password.push(lowercase[Math.floor(Math.random() * lowercase.length)] ?? "a");
  password.push(numbers[Math.floor(Math.random() * numbers.length)] ?? "0");
  password.push(symbols[Math.floor(Math.random() * symbols.length)] ?? "!");

  // Fill remaining characters (12 - 4 = 8 more)
  for (let i = 0; i < 8; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)] ?? "x");
  }

  // Shuffle the password array to randomize positions
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = password[i];
    password[i] = password[j] ?? "";
    password[j] = temp ?? "";
  }

  return password.join("");
}

export const createImportsService = (db = defaultDb) => ({
  /**
   * Enhanced importUsers function with password handling, upsert mode, and history tracking.
   *
   * @param input - Import input containing rows, upsertMode, and skipInvalid flags
   * @param userId - The ID of the user performing the import
   * @returns Import result with results, generated passwords, history ID, and summary
   */
  async importUsers(
    input: ImportUsersInput,
    userId: string,
  ): Promise<ImportResult> {
    const results: ImportResultItem[] = [];
    const generatedPasswords: Map<string, string> = new Map();

    // Normalize emails to lowercase (Better Auth does case-sensitive lookups)
    const normalizedRows = input.rows.map((row) => ({
      ...row,
      email: row.email?.toLowerCase(),
    }));

    // Batch fetch existing users by email for efficiency
    const emails = normalizedRows
      .map((row) => row.email)
      .filter((email): email is string => email != null && email !== "");

    const existingUsers =
      emails.length > 0
        ? await db
            .select({ id: user.id, email: user.email })
            .from(user)
            .where(inArray(user.email, emails))
        : [];

    const existingUserMap = new Map(existingUsers.map((u) => [u.email, u.id]));

    for (const row of normalizedRows) {
      if (!row.email) {
        results.push({
          identifier: row.email ?? "unknown",
          status: "failed",
          errorMessage: "Email is required",
        });
        continue;
      }

      const existingUserId = existingUserMap.get(row.email);

      // Handle existing user case
      if (existingUserId) {
        if (!input.upsertMode) {
          // Skip existing records when upsert mode is disabled
          results.push({ identifier: row.email, status: "skipped" });
          continue;
        }

        // Update existing user (upsert mode enabled)
        try {
          const updateData: Partial<UserInsert> = {
            name: row.name,
            sapNo: row.sapNo,
            role: row.role,
            status: row.status ?? "ACTIVE",
            departmentId: row.departmentId ?? null,
            reportsToManagerId: row.reportsToManagerId ?? null,
            updatedAt: new Date(),
          };

          await db
            .update(user)
            .set(updateData)
            .where(eq(user.id, existingUserId));

          // If password is provided in upsert, update it in account table
          if (row.password) {
            const passwordHash = await hashPassword(row.password);
            await db
              .update(account)
              .set({
                password: passwordHash,
                updatedAt: new Date(),
              })
              .where(eq(account.userId, existingUserId));
          }

          results.push({ identifier: row.email, status: "updated" });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.push({
            identifier: row.email,
            status: "failed",
            errorMessage,
          });
        }
        continue;
      }

      // Insert new user
      try {
        // Generate or use provided password
        const password = row.password || generateSecurePassword();
        const passwordHash = await hashPassword(password);

        const userId = randomUUID();
        const now = new Date();

        const userValues: UserInsert = {
          id: userId,
          name: row.name,
          email: row.email,
          emailVerified: true,
          role: row.role,
          status: row.status ?? "ACTIVE", // Default to ACTIVE if not provided
          sapNo: row.sapNo,
          departmentId: row.departmentId ?? null,
          reportsToManagerId: row.reportsToManagerId ?? null,
          passwordHash: null, // Better Auth expects password in account table
          signatureUrl: null,
          failedLoginAttempts: 0,
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(user).values(userValues);

        // Insert account record for Better Auth credential authentication
        await db.insert(account).values({
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });

        // Store generated password for new users (only if we generated it)
        if (!row.password) {
          generatedPasswords.set(row.email, password);
        }

        results.push({ identifier: row.email, status: "inserted" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          identifier: row.email,
          status: "failed",
          errorMessage,
        });
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      inserted: results.filter((r) => r.status === "inserted").length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
    };

    // Create import history record
    const [historyRecord] = await db
      .insert(importHistory)
      .values({
        type: "users",
        userId,
        filename: null,
        totalRows: summary.total,
        insertedCount: summary.inserted,
        updatedCount: summary.updated,
        skippedCount: summary.skipped,
        failedCount: summary.failed,
        upsertMode: input.upsertMode,
        createdAt: new Date(),
      })
      .returning({ id: importHistory.id });

    const historyId = historyRecord?.id ?? randomUUID();

    // Create import history items for each row
    if (results.length > 0) {
      const historyItems = results.map((result, index) => ({
        importHistoryId: historyId,
        rowNumber: index + 1,
        identifier: result.identifier,
        status: result.status,
        errorMessage: result.errorMessage ?? null,
        createdAt: new Date(),
      }));

      await db.insert(importHistoryItem).values(historyItems);
    }

    return {
      results,
      generatedPasswords: Object.fromEntries(generatedPasswords),
      historyId,
      summary,
    };
  },

  /**
   * Enhanced importDepartments function with upsert mode and history tracking.
   *
   * @param input - Import input containing rows, upsertMode, and skipInvalid flags
   * @param userId - The ID of the user performing the import
   * @returns Import result with results, history ID, and summary
   */
  async importDepartments(
    input: ImportDepartmentsInput,
    userId: string,
  ): Promise<ImportResult> {
    const results: ImportResultItem[] = [];

    // Batch fetch existing departments by name for efficiency
    const names = input.rows
      .map((row) => row.name)
      .filter((name): name is string => name != null && name !== "");

    const existingDepartments =
      names.length > 0
        ? await db
            .select({ id: department.id, name: department.name })
            .from(department)
            .where(inArray(department.name, names))
        : [];

    const existingDepartmentMap = new Map(
      existingDepartments.map((d) => [d.name, d.id]),
    );

    for (const row of input.rows) {
      if (!row.name) {
        results.push({
          identifier: row.name ?? "unknown",
          status: "failed",
          errorMessage: "Name is required",
        });
        continue;
      }

      const existingDepartmentId = existingDepartmentMap.get(row.name);

      // Handle existing department case
      if (existingDepartmentId) {
        if (!input.upsertMode) {
          // Skip existing records when upsert mode is disabled
          results.push({ identifier: row.name, status: "skipped" });
          continue;
        }

        // Update existing department (upsert mode enabled)
        try {
          const updateData: Partial<typeof department.$inferInsert> = {
            costCenterCode: row.costCenterCode,
            headOfDepartmentId: row.headOfDepartmentId ?? null,
            updatedAt: new Date(),
          };

          await db
            .update(department)
            .set(updateData)
            .where(eq(department.id, existingDepartmentId));

          results.push({ identifier: row.name, status: "updated" });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.push({
            identifier: row.name,
            status: "failed",
            errorMessage,
          });
        }
        continue;
      }

      // Insert new department
      try {
        await db.insert(department).values({
          name: row.name,
          costCenterCode: row.costCenterCode,
          headOfDepartmentId: row.headOfDepartmentId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        results.push({ identifier: row.name, status: "inserted" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          identifier: row.name,
          status: "failed",
          errorMessage,
        });
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      inserted: results.filter((r) => r.status === "inserted").length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
    };

    // Create import history record
    const [historyRecord] = await db
      .insert(importHistory)
      .values({
        type: "departments",
        userId,
        filename: null,
        totalRows: summary.total,
        insertedCount: summary.inserted,
        updatedCount: summary.updated,
        skippedCount: summary.skipped,
        failedCount: summary.failed,
        upsertMode: input.upsertMode,
        createdAt: new Date(),
      })
      .returning({ id: importHistory.id });

    const historyId = historyRecord?.id ?? randomUUID();

    // Create import history items for each row
    if (results.length > 0) {
      const historyItems = results.map((result, index) => ({
        importHistoryId: historyId,
        rowNumber: index + 1,
        identifier: result.identifier,
        status: result.status,
        errorMessage: result.errorMessage ?? null,
        createdAt: new Date(),
      }));

      await db.insert(importHistoryItem).values(historyItems);
    }

    return {
      results,
      historyId,
      summary,
    };
  },

  /**
   * Validates user import rows against schema and database constraints.
   *
   * @param rows - Array of user import rows to validate
   * @param upsertMode - If true, existing records will be marked for update
   * @returns Array of validation results with row index, validity, errors, and willUpdate flag
   */
  async validateUserRows(
    rows: UserImportRow[],
    upsertMode = false,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Batch fetch all referenced entities for efficiency
    const departmentIds = [
      ...new Set(
        rows
          .map((row) => row.departmentId)
          .filter((id): id is string => id != null && id !== ""),
      ),
    ];
    const managerIds = [
      ...new Set(
        rows
          .map((row) => row.reportsToManagerId)
          .filter((id): id is string => id != null && id !== ""),
      ),
    ];
    // Normalize emails to lowercase for comparison
    const emails = rows
      .map((row) => row.email?.toLowerCase())
      .filter((email): email is string => email != null && email !== "");

    // Fetch existing departments
    const existingDepartments =
      departmentIds.length > 0
        ? await db
            .select({ id: department.id })
            .from(department)
            .where(inArray(department.id, departmentIds))
        : [];
    const validDepartmentIds = new Set(existingDepartments.map((d) => d.id));

    // Fetch existing users (for manager validation and email existence check)
    const existingUsers =
      managerIds.length > 0
        ? await db
            .select({ id: user.id, email: user.email })
            .from(user)
            .where(inArray(user.id, managerIds))
        : [];

    // Also fetch users by email for willUpdate check
    const existingUsersByEmail =
      emails.length > 0
        ? await db
            .select({ id: user.id, email: user.email })
            .from(user)
            .where(inArray(user.email, emails))
        : [];

    const validManagerIds = new Set(existingUsers.map((u) => u.id));
    const existingEmailSet = new Set(existingUsersByEmail.map((u) => u.email));

    // Validate each row
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }
      const errors: ValidationError[] = [];

      // Schema validation using Zod safeParse
      const schemaResult = userImportRowSchema.safeParse(row);

      if (!schemaResult.success) {
        // Extract field-specific errors from Zod
        for (const issue of schemaResult.error.issues) {
          const field = issue.path.join(".");
          errors.push({
            field: field || "unknown",
            message: issue.message,
          });
        }
      }

      // Database constraint validations (only if schema validation passed for those fields)
      // Validate departmentId exists in database
      const departmentId = row.departmentId;
      if (
        departmentId != null &&
        departmentId !== "" &&
        !validDepartmentIds.has(departmentId)
      ) {
        errors.push({
          field: "departmentId",
          message: "Department does not exist",
        });
      }

      // Validate reportsToManagerId exists in database
      const managerId = row.reportsToManagerId;
      if (
        managerId != null &&
        managerId !== "" &&
        !validManagerIds.has(managerId)
      ) {
        errors.push({
          field: "reportsToManagerId",
          message: "Manager does not exist",
        });
      }

      // Determine if this row will update an existing record
      const email = row.email;
      const willUpdate =
        upsertMode && email != null && existingEmailSet.has(email);

      results.push({
        rowIndex,
        isValid: errors.length === 0,
        errors,
        willUpdate,
      });
    }

    return results;
  },

  /**
   * Validates department import rows against schema and database constraints.
   *
   * @param rows - Array of department import rows to validate
   * @param upsertMode - If true, existing records will be marked for update
   * @returns Array of validation results with row index, validity, errors, and willUpdate flag
   */
  async validateDepartmentRows(
    rows: DepartmentImportRow[],
    upsertMode = false,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Batch fetch all referenced entities for efficiency
    const headOfDepartmentIds = [
      ...new Set(
        rows
          .map((row) => row.headOfDepartmentId)
          .filter((id): id is string => id != null && id !== ""),
      ),
    ];
    const departmentNames = rows
      .map((row) => row.name)
      .filter((name): name is string => name != null && name !== "");

    // Fetch existing users (for headOfDepartmentId validation)
    const existingUsers =
      headOfDepartmentIds.length > 0
        ? await db
            .select({ id: user.id })
            .from(user)
            .where(inArray(user.id, headOfDepartmentIds))
        : [];
    const validUserIds = new Set(existingUsers.map((u) => u.id));

    // Fetch existing departments by name for willUpdate check
    const existingDepartments =
      departmentNames.length > 0
        ? await db
            .select({ id: department.id, name: department.name })
            .from(department)
            .where(inArray(department.name, departmentNames))
        : [];
    const existingDepartmentNameSet = new Set(
      existingDepartments.map((d) => d.name),
    );

    // Validate each row
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }
      const errors: ValidationError[] = [];

      // Schema validation using Zod safeParse
      const schemaResult = departmentImportRowSchema.safeParse(row);

      if (!schemaResult.success) {
        // Extract field-specific errors from Zod
        for (const issue of schemaResult.error.issues) {
          const field = issue.path.join(".");
          errors.push({
            field: field || "unknown",
            message: issue.message,
          });
        }
      }

      // Database constraint validations
      // Validate headOfDepartmentId exists in database (must be a valid user)
      const headOfDepartmentId = row.headOfDepartmentId;
      if (
        headOfDepartmentId != null &&
        headOfDepartmentId !== "" &&
        !validUserIds.has(headOfDepartmentId)
      ) {
        errors.push({
          field: "headOfDepartmentId",
          message: "Head of department does not exist",
        });
      }

      // Determine if this row will update an existing record
      const name = row.name;
      const willUpdate =
        upsertMode && name != null && existingDepartmentNameSet.has(name);

      results.push({
        rowIndex,
        isValid: errors.length === 0,
        errors,
        willUpdate,
      });
    }

    return results;
  },

  /**
   * Retrieves paginated import history with optional filtering by type.
   * Returns results in reverse chronological order (most recent first).
   *
   * @param params - Pagination and filter parameters (type, limit, offset)
   * @returns Array of import history records with user information
   */
  async getImportHistory(params: GetHistoryInput): Promise<ImportHistory[]> {
    const { type, limit = 10, offset = 0 } = params;

    // Build query with optional type filter
    const query = db
      .select({
        id: importHistory.id,
        type: importHistory.type,
        userId: importHistory.userId,
        userName: user.name,
        filename: importHistory.filename,
        totalRows: importHistory.totalRows,
        insertedCount: importHistory.insertedCount,
        updatedCount: importHistory.updatedCount,
        skippedCount: importHistory.skippedCount,
        failedCount: importHistory.failedCount,
        upsertMode: importHistory.upsertMode,
        createdAt: importHistory.createdAt,
      })
      .from(importHistory)
      .leftJoin(user, eq(importHistory.userId, user.id))
      .orderBy(desc(importHistory.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply type filter if provided
    const results = type
      ? await query.where(eq(importHistory.type, type))
      : await query;

    // Map results to ImportHistory type
    return results.map((row) => ({
      id: row.id,
      type: row.type as "users" | "departments",
      userId: row.userId,
      userName: row.userName ?? "Unknown User",
      filename: row.filename,
      totalRows: row.totalRows,
      insertedCount: row.insertedCount,
      updatedCount: row.updatedCount,
      skippedCount: row.skippedCount,
      failedCount: row.failedCount,
      upsertMode: row.upsertMode,
      createdAt: row.createdAt,
    }));
  },

  /**
   * Retrieves detailed information for a specific import, including all row items.
   *
   * @param id - The UUID of the import history record
   * @returns Import history details with all associated items
   * @throws Error if import history record is not found
   */
  async getImportHistoryDetails(id: string): Promise<ImportHistoryDetails> {
    // Fetch the import history record with user info
    const [historyRecord] = await db
      .select({
        id: importHistory.id,
        type: importHistory.type,
        userId: importHistory.userId,
        userName: user.name,
        filename: importHistory.filename,
        totalRows: importHistory.totalRows,
        insertedCount: importHistory.insertedCount,
        updatedCount: importHistory.updatedCount,
        skippedCount: importHistory.skippedCount,
        failedCount: importHistory.failedCount,
        upsertMode: importHistory.upsertMode,
        createdAt: importHistory.createdAt,
      })
      .from(importHistory)
      .leftJoin(user, eq(importHistory.userId, user.id))
      .where(eq(importHistory.id, id));

    if (!historyRecord) {
      throw new Error(`Import history record not found: ${id}`);
    }

    // Fetch all items for this import history
    const items = await db
      .select({
        id: importHistoryItem.id,
        importHistoryId: importHistoryItem.importHistoryId,
        rowNumber: importHistoryItem.rowNumber,
        identifier: importHistoryItem.identifier,
        status: importHistoryItem.status,
        errorMessage: importHistoryItem.errorMessage,
        createdAt: importHistoryItem.createdAt,
      })
      .from(importHistoryItem)
      .where(eq(importHistoryItem.importHistoryId, id))
      .orderBy(importHistoryItem.rowNumber);

    return {
      history: {
        id: historyRecord.id,
        type: historyRecord.type as "users" | "departments",
        userId: historyRecord.userId,
        userName: historyRecord.userName ?? "Unknown User",
        filename: historyRecord.filename,
        totalRows: historyRecord.totalRows,
        insertedCount: historyRecord.insertedCount,
        updatedCount: historyRecord.updatedCount,
        skippedCount: historyRecord.skippedCount,
        failedCount: historyRecord.failedCount,
        upsertMode: historyRecord.upsertMode,
        createdAt: historyRecord.createdAt,
      },
      items: items.map((item) => ({
        id: item.id,
        importHistoryId: item.importHistoryId,
        rowNumber: item.rowNumber,
        identifier: item.identifier,
        status: item.status as "inserted" | "updated" | "skipped" | "failed",
        errorMessage: item.errorMessage,
        createdAt: item.createdAt,
      })),
    };
  },
});

export type ImportsService = ReturnType<typeof createImportsService>;
