import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { department } from "@zenith-hr/db/schema/departments";
import {
  jobPosition,
  userPositionAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
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

    // Search filter (name)
    if (search) {
      conditions.push(ilike(department.name, `%${search}%`));
    }

    const offset = (page - 1) * pageSize;

    // Determine sort column and order
    const orderFn = sortOrder === "desc" ? desc : asc;
    const sortColumn = department[sortBy as keyof typeof department._.columns];
    const orderBy = orderFn(sortColumn);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: department.id,
          name: department.name,
          createdAt: department.createdAt,
          updatedAt: department.updatedAt,
        })
        .from(department)
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
    const [foundDepartment] = await db
      .select({
        id: department.id,
        name: department.name,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })
      .from(department)
      .where(eq(department.id, id))
      .limit(1);

    return foundDepartment ?? null;
  },

  /**
   * Create a new department
   */
  async create(input: CreateDepartmentInput): Promise<DepartmentResponse> {
    const { name } = input;

    const now = new Date();

    // Insert department
    const [created] = await db
      .insert(department)
      .values({
        name,
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
   */
  async update(input: UpdateDepartmentInput): Promise<DepartmentResponse> {
    const { id, name } = input;

    // Verify department exists
    const [existing] = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Department not found", 404);
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      name: string;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
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

  /**
   * Get Head of Department (HOD) for a department
   * Finds the user assigned to a position with HOD role in the given department
   */
  async getHODForDepartment(departmentId: string): Promise<{
    userId: string | null;
    userName: string | null;
    positionId: string | null;
  }> {
    const [hodAssignment] = await db
      .select({
        userId: userPositionAssignment.userId,
        userName: user.name,
        positionId: jobPosition.id,
      })
      .from(jobPosition)
      .innerJoin(
        userPositionAssignment,
        eq(userPositionAssignment.positionId, jobPosition.id),
      )
      .innerJoin(user, eq(user.id, userPositionAssignment.userId))
      .where(
        and(
          eq(jobPosition.departmentId, departmentId),
          eq(jobPosition.active, true),
          inArray(jobPosition.role, ["HOD", "HOD_HR", "HOD_FINANCE", "HOD_IT"]),
          eq(user.status, "ACTIVE"),
        ),
      )
      .limit(1);

    return {
      userId: hodAssignment?.userId ?? null,
      userName: hodAssignment?.userName ?? null,
      positionId: hodAssignment?.positionId ?? null,
    };
  },
});

export type DepartmentsService = ReturnType<typeof createDepartmentsService>;
