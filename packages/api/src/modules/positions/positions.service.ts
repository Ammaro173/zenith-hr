import type { DbOrTx } from "@zenith-hr/db";
import { department } from "@zenith-hr/db/schema/departments";
import { jobDescription } from "@zenith-hr/db/schema/job-descriptions";
import { jobPosition } from "@zenith-hr/db/schema/position-slots";
import { asc, eq, ilike, or } from "drizzle-orm";
import type {
  PositionSearchResponse,
  SearchPositionsInput,
} from "./positions.schema";

export const createPositionsService = (db: DbOrTx) => ({
  async search(input: SearchPositionsInput): Promise<PositionSearchResponse[]> {
    const query = db
      .select({
        id: jobPosition.id,
        code: jobPosition.code,
        name: jobPosition.name,
        departmentId: jobPosition.departmentId,
        departmentName: department.name,
        reportsToPositionId: jobPosition.reportsToPositionId,
        jobDescriptionId: jobPosition.jobDescriptionId,
        jobTitle: jobDescription.title,
        assignedRole: jobDescription.assignedRole,
      })
      .from(jobPosition)
      .leftJoin(department, eq(department.id, jobPosition.departmentId))
      .leftJoin(
        jobDescription,
        eq(jobDescription.id, jobPosition.jobDescriptionId),
      );

    if (!input.query.trim()) {
      return await query.orderBy(asc(jobPosition.name)).limit(input.limit);
    }

    return await query
      .where(
        or(
          ilike(jobPosition.name, `%${input.query}%`),
          ilike(jobPosition.code, `%${input.query}%`),
          ilike(jobDescription.title, `%${input.query}%`),
          ilike(department.name, `%${input.query}%`),
        ),
      )
      .orderBy(asc(jobPosition.name))
      .limit(input.limit);
  },
});

export type PositionsService = ReturnType<typeof createPositionsService>;
