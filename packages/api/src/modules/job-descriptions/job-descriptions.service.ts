import type { DbOrTx } from "@zenith-hr/db";
import { department } from "@zenith-hr/db/schema/departments";
import { jobDescription } from "@zenith-hr/db/schema/job-descriptions";
import { jobPosition } from "@zenith-hr/db/schema/position-slots";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import type {
  CreateJobDescriptionInput,
  DeleteJobDescriptionInput,
  JobDescriptionResponse,
  SearchJobDescriptionsInput,
  SearchJobDescriptionsResponse,
  UpdateJobDescriptionInput,
} from "./job-descriptions.schema";

/**
 * Factory function to create JobDescriptionsService with injected dependencies
 */
export const createJobDescriptionsService = (db: DbOrTx) => ({
  /**
   * Search job descriptions with server-side pagination
   */
  async search(
    params: SearchJobDescriptionsInput,
  ): Promise<SearchJobDescriptionsResponse> {
    const { search, page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const whereClause =
      search && search.trim().length > 0
        ? or(
            ilike(jobDescription.title, `%${search}%`),
            ilike(jobDescription.description, `%${search}%`),
          )
        : undefined;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: jobDescription.id,
          title: jobDescription.title,
          description: jobDescription.description,
          responsibilities: jobDescription.responsibilities,
          departmentId: jobDescription.departmentId,
          departmentName: department.name,
          reportsToPositionId: jobDescription.reportsToPositionId,
          reportsToPositionName: jobPosition.name,
          assignedRole: jobDescription.assignedRole,
          grade: jobDescription.grade,
          minSalary: jobDescription.minSalary,
          maxSalary: jobDescription.maxSalary,
          active: jobDescription.active,
          createdAt: jobDescription.createdAt,
          updatedAt: jobDescription.updatedAt,
        })
        .from(jobDescription)
        .leftJoin(department, eq(jobDescription.departmentId, department.id))
        .leftJoin(
          jobPosition,
          eq(jobDescription.reportsToPositionId, jobPosition.id),
        )
        .where(whereClause)
        .orderBy(desc(jobDescription.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(jobDescription).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: rows,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  },

  /**
   * Get job description by ID
   */
  async getById(id: string): Promise<JobDescriptionResponse | null> {
    const [result] = await db
      .select({
        id: jobDescription.id,
        title: jobDescription.title,
        description: jobDescription.description,
        responsibilities: jobDescription.responsibilities,
        departmentId: jobDescription.departmentId,
        departmentName: department.name,
        reportsToPositionId: jobDescription.reportsToPositionId,
        reportsToPositionName: jobPosition.name,
        assignedRole: jobDescription.assignedRole,
        grade: jobDescription.grade,
        minSalary: jobDescription.minSalary,
        maxSalary: jobDescription.maxSalary,
        active: jobDescription.active,
        createdAt: jobDescription.createdAt,
        updatedAt: jobDescription.updatedAt,
      })
      .from(jobDescription)
      .leftJoin(department, eq(jobDescription.departmentId, department.id))
      .leftJoin(
        jobPosition,
        eq(jobDescription.reportsToPositionId, jobPosition.id),
      )
      .where(eq(jobDescription.id, id))
      .limit(1);

    return result || null;
  },

  /**
   * Create a new job description
   */
  async create(
    input: CreateJobDescriptionInput,
  ): Promise<JobDescriptionResponse> {
    const [newJobDescription] = await db
      .insert(jobDescription)
      .values({
        title: input.title,
        description: input.description,
        responsibilities: input.responsibilities || null,
        departmentId: input.departmentId ?? null,
        reportsToPositionId: input.reportsToPositionId ?? null,
        assignedRole: input.assignedRole,
        grade: input.grade ?? null,
        minSalary: input.minSalary ?? null,
        maxSalary: input.maxSalary ?? null,
      })
      .returning();

    if (!newJobDescription) {
      throw new Error("Failed to create job description");
    }

    return {
      ...newJobDescription,
      departmentName: null,
      reportsToPositionName: null,
    };
  },

  /**
   * Update a job description
   */
  async update(
    input: UpdateJobDescriptionInput,
  ): Promise<JobDescriptionResponse> {
    const [updated] = await db
      .update(jobDescription)
      .set({
        title: input.title,
        description: input.description,
        responsibilities: input.responsibilities || null,
        departmentId: input.departmentId ?? null,
        reportsToPositionId: input.reportsToPositionId ?? null,
        assignedRole: input.assignedRole,
        grade: input.grade ?? null,
        minSalary: input.minSalary ?? null,
        maxSalary: input.maxSalary ?? null,
        updatedAt: new Date(),
      })
      .where(eq(jobDescription.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Job description not found");
    }

    return {
      ...updated,
      departmentName: null,
      reportsToPositionName: null,
    };
  },

  /**
   * Delete a job description
   */
  async delete(input: DeleteJobDescriptionInput): Promise<void> {
    const [deleted] = await db
      .delete(jobDescription)
      .where(eq(jobDescription.id, input.id))
      .returning();

    if (!deleted) {
      throw new Error("Job description not found");
    }
  },
});

export type JobDescriptionsService = ReturnType<
  typeof createJobDescriptionsService
>;
