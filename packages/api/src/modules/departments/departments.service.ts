import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { department } from "@zenith-hr/db/schema/departments";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { AppError } from "../../shared/errors";
import type {
  CreateDepartmentInput,
  DepartmentResponse,
  ListDepartmentsInput,
  PaginatedDepartmentsResult,
  UpdateDepartmentInput,
} from "./departments.schema";

export const createDepartmentsService = (db: DbOrTx) => ({
  /**
   * List departments with pagination, sorting, and search filtering
   */
  async list(
    params: ListDepartmentsInput,
  ): Promise<PaginatedDepartmentsResult> {
    const { page, pageSize, search, sortBy, sortOrder } = params;

    // biome-ignore lint/suspicious/noExplicitAny: drizzle condition types are complex
    const conditions: any[] = [];

    // Search filter (name or cost center code)
    if (search) {
      conditions.push(
        or(
          ilike(department.name, `%${search}%`),
          ilike(department.costCenterCode, `%${search}%`),
        ),
      );
    }

    const offset = (page - 1) * pageSize;

    // Determine sort column and order
    const orderFn = sortOrder === "desc" ? desc : asc;
    const sortColumn = department[sortBy as keyof typeof department._.columns];
    const orderBy = orderFn(sortColumn);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Alias for head of department join
    const headOfDept = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("head_of_dept");

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: department.id,
          name: department.name,
          costCenterCode: department.costCenterCode,
          headOfDepartmentId: department.headOfDepartmentId,
          headOfDepartmentName: headOfDept.name,
          createdAt: department.createdAt,
          updatedAt: department.updatedAt,
        })
        .from(department)
        .leftJoin(headOfDept, eq(department.headOfDepartmentId, headOfDept.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(department).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  },

  /**
   * Get a department by ID with head of department info
   */
  async getById(id: string): Promise<DepartmentResponse | null> {
    // Alias for head of department join
    const headOfDept = db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .as("head_of_dept");

    const [foundDepartment] = await db
      .select({
        id: department.id,
        name: department.name,
        costCenterCode: department.costCenterCode,
        headOfDepartmentId: department.headOfDepartmentId,
        headOfDepartmentName: headOfDept.name,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })
      .from(department)
      .leftJoin(headOfDept, eq(department.headOfDepartmentId, headOfDept.id))
      .where(eq(department.id, id))
      .limit(1);

    return foundDepartment ?? null;
  },

  /**
   * Create a new department
   * - Checks for duplicate cost center code
   * - Validates head of department exists if provided
   */
  async create(input: CreateDepartmentInput): Promise<DepartmentResponse> {
    const { name, costCenterCode, headOfDepartmentId } = input;

    // Check for duplicate cost center code
    const existingByCode = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.costCenterCode, costCenterCode))
      .limit(1);

    if (existingByCode.length > 0) {
      throw new AppError(
        "CONFLICT",
        "A department with this cost center code already exists",
        409,
      );
    }

    // Validate head of department exists if provided
    if (headOfDepartmentId) {
      const headExists = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, headOfDepartmentId))
        .limit(1);

      if (headExists.length === 0) {
        throw new AppError(
          "NOT_FOUND",
          "Head of department user not found",
          404,
        );
      }
    }

    const now = new Date();

    // Insert department
    const [created] = await db
      .insert(department)
      .values({
        name,
        costCenterCode,
        headOfDepartmentId: headOfDepartmentId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new AppError("INTERNAL_ERROR", "Failed to create department", 500);
    }

    // Fetch with head of department join
    const result = await this.getById(created.id);
    if (!result) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Failed to fetch created department",
        500,
      );
    }

    return result;
  },

  /**
   * Update an existing department
   * - Validates department exists
   * - Checks for duplicate cost center code if changed
   * - Validates head of department exists if provided
   */
  async update(input: UpdateDepartmentInput): Promise<DepartmentResponse> {
    const { id, name, costCenterCode, headOfDepartmentId } = input;

    // Verify department exists
    const [existing] = await db
      .select({
        id: department.id,
        costCenterCode: department.costCenterCode,
      })
      .from(department)
      .where(eq(department.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Department not found", 404);
    }

    // Check for duplicate cost center code if changed
    if (
      costCenterCode !== undefined &&
      costCenterCode !== existing.costCenterCode
    ) {
      const existingByCode = await db
        .select({ id: department.id })
        .from(department)
        .where(eq(department.costCenterCode, costCenterCode))
        .limit(1);

      if (existingByCode.length > 0) {
        throw new AppError(
          "CONFLICT",
          "A department with this cost center code already exists",
          409,
        );
      }
    }

    // Validate head of department exists if provided and not null
    if (headOfDepartmentId !== undefined && headOfDepartmentId !== null) {
      const headExists = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, headOfDepartmentId))
        .limit(1);

      if (headExists.length === 0) {
        throw new AppError(
          "NOT_FOUND",
          "Head of department user not found",
          404,
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      name: string;
      costCenterCode: string;
      headOfDepartmentId: string | null;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (costCenterCode !== undefined) {
      updateData.costCenterCode = costCenterCode;
    }
    if (headOfDepartmentId !== undefined) {
      updateData.headOfDepartmentId = headOfDepartmentId;
    }

    // Update department
    await db.update(department).set(updateData).where(eq(department.id, id));

    // Fetch updated department with joins
    const result = await this.getById(id);
    if (!result) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Failed to fetch updated department",
        500,
      );
    }

    return result;
  },

  /**
   * Delete a department
   * - Validates department exists
   * - Checks for assigned users (prevents deletion if any)
   */
  async delete(id: string): Promise<void> {
    // Verify department exists
    const [existing] = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Department not found", 404);
    }

    // Check for assigned users
    const assignedUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.departmentId, id))
      .limit(1);

    if (assignedUsers.length > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete department with assigned users",
        409,
      );
    }

    // Delete department
    await db.delete(department).where(eq(department.id, id));
  },

  /**
   * Get all departments for dropdown (simple list without pagination)
   */
  async getAll(): Promise<Array<{ id: string; name: string }>> {
    return await db
      .select({
        id: department.id,
        name: department.name,
      })
      .from(department)
      .orderBy(asc(department.name));
  },
});

export type DepartmentsService = ReturnType<typeof createDepartmentsService>;
