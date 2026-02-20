import type { DbOrTx } from "@zenith-hr/db";
import { department } from "@zenith-hr/db/schema/departments";
import { jobDescription } from "@zenith-hr/db/schema/job-descriptions";
import { jobPosition } from "@zenith-hr/db/schema/position-slots";
import { desc, eq, ilike, or } from "drizzle-orm";
import type {
  CreateJobDescriptionInput,
  DeleteJobDescriptionInput,
  JobDescriptionResponse,
  SearchJobDescriptionsInput,
  UpdateJobDescriptionInput,
} from "./job-descriptions.schema";

/**
 * Factory function to create JobDescriptionsService with injected dependencies
 */
export const createJobDescriptionsService = (db: DbOrTx) => ({
  /**
   * Search job descriptions by title
   */
  async search(
    params: SearchJobDescriptionsInput,
  ): Promise<JobDescriptionResponse[]> {
    const { search, limit } = params;

    let query = db
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
        createdAt: jobDescription.createdAt,
        updatedAt: jobDescription.updatedAt,
      })
      .from(jobDescription)
      .leftJoin(department, eq(jobDescription.departmentId, department.id))
      .leftJoin(
        jobPosition,
        eq(jobDescription.reportsToPositionId, jobPosition.id),
      );

    if (search && search.trim().length > 0) {
      query = query.where(
        or(
          ilike(jobDescription.title, `%${search}%`),
          ilike(jobDescription.description, `%${search}%`),
        ),
      ) as typeof query;
    }

    const results = await query
      .orderBy(desc(jobDescription.createdAt))
      .limit(limit);

    return results;
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
