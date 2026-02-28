import type { DbOrTx } from "@zenith-hr/db";
import { department } from "@zenith-hr/db/schema/departments";
import { jobPosition } from "@zenith-hr/db/schema/position-slots";
import { asc, eq, ilike, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { AppError } from "../../shared/errors";
import type {
  CreatePositionInput,
  PositionResponse,
  PositionSearchResponse,
  SearchPositionsInput,
  UpdatePositionInput,
} from "./positions.schema";

function shortId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export const createPositionsService = (db: DbOrTx) => {
  const reportsTo = alias(jobPosition, "reports_to");

  const fetchPositionById = async (
    id: string,
  ): Promise<PositionResponse | null> => {
    const [row] = await db
      .select({
        id: jobPosition.id,
        code: jobPosition.code,
        name: jobPosition.name,
        description: jobPosition.description,
        responsibilities: jobPosition.responsibilities,
        grade: jobPosition.grade,
        role: jobPosition.role,
        departmentId: jobPosition.departmentId,
        departmentName: department.name,
        reportsToPositionId: jobPosition.reportsToPositionId,
        reportsToPositionName: reportsTo.name,
        active: jobPosition.active,
        createdAt: jobPosition.createdAt,
        updatedAt: jobPosition.updatedAt,
      })
      .from(jobPosition)
      .leftJoin(department, eq(department.id, jobPosition.departmentId))
      .leftJoin(reportsTo, eq(reportsTo.id, jobPosition.reportsToPositionId))
      .where(eq(jobPosition.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      responsibilities: row.responsibilities ?? null,
      grade: row.grade ?? null,
      role: row.role,
      departmentId: row.departmentId ?? null,
      departmentName: row.departmentName ?? null,
      reportsToPositionId: row.reportsToPositionId ?? null,
      reportsToPositionName: row.reportsToPositionName ?? null,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  };

  return {
    async search(
      input: SearchPositionsInput,
    ): Promise<PositionSearchResponse[]> {
      const baseSelect = {
        id: jobPosition.id,
        code: jobPosition.code,
        name: jobPosition.name,
        description: jobPosition.description,
        responsibilities: jobPosition.responsibilities,
        grade: jobPosition.grade,
        departmentId: jobPosition.departmentId,
        departmentName: department.name,
        reportsToPositionId: jobPosition.reportsToPositionId,
        reportsToPositionName: reportsTo.name,
        role: jobPosition.role,
        active: jobPosition.active,
      };

      const query = db
        .select(baseSelect)
        .from(jobPosition)
        .leftJoin(department, eq(department.id, jobPosition.departmentId))
        .leftJoin(reportsTo, eq(reportsTo.id, jobPosition.reportsToPositionId));

      if (!input.query.trim()) {
        const rows = await query
          .orderBy(asc(jobPosition.name))
          .limit(input.limit);
        return rows.map((r) => ({
          ...r,
          departmentName: r.departmentName ?? null,
          reportsToPositionName: r.reportsToPositionName ?? null,
        }));
      }

      const rows = await query
        .where(
          or(
            ilike(jobPosition.name, `%${input.query}%`),
            ilike(jobPosition.code, `%${input.query}%`),
            ilike(jobPosition.description, `%${input.query}%`),
            ilike(department.name, `%${input.query}%`),
          ),
        )
        .orderBy(asc(jobPosition.name))
        .limit(input.limit);

      return rows.map((r) => ({
        ...r,
        departmentName: r.departmentName ?? null,
        reportsToPositionName: r.reportsToPositionName ?? null,
      }));
    },

    async create(input: CreatePositionInput): Promise<PositionResponse> {
      const code =
        input.code ?? `POS-${shortId()}-${Date.now().toString(36).slice(-4)}`;
      const [row] = await db
        .insert(jobPosition)
        .values({
          name: input.name,
          code,
          description: input.description ?? null,
          responsibilities: input.responsibilities ?? null,
          grade: input.grade ?? null,
          role: input.role,
          departmentId: input.departmentId ?? null,
          reportsToPositionId: input.reportsToPositionId ?? null,
          active: input.active,
        })
        .returning();

      if (!row) {
        throw new AppError("INTERNAL_ERROR", "Failed to create position", 500);
      }

      const result = await fetchPositionById(row.id);
      if (!result) {
        throw new AppError(
          "INTERNAL_ERROR",
          "Failed to fetch created position",
          500,
        );
      }
      return result;
    },

    getById: fetchPositionById,

    async update(
      id: string,
      input: UpdatePositionInput,
    ): Promise<PositionResponse | null> {
      const [row] = await db
        .update(jobPosition)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.code !== undefined && { code: input.code }),
          ...(input.description !== undefined && {
            description: input.description ?? null,
          }),
          ...(input.responsibilities !== undefined && {
            responsibilities: input.responsibilities ?? null,
          }),
          ...(input.grade !== undefined && { grade: input.grade ?? null }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.departmentId !== undefined && {
            departmentId: input.departmentId ?? null,
          }),
          ...(input.reportsToPositionId !== undefined && {
            reportsToPositionId: input.reportsToPositionId ?? null,
          }),
          ...(input.active !== undefined && { active: input.active }),
          updatedAt: new Date(),
        })
        .where(eq(jobPosition.id, id))
        .returning();

      if (!row) {
        return null;
      }

      return fetchPositionById(id);
    },

    async delete(id: string): Promise<boolean> {
      const [row] = await db
        .delete(jobPosition)
        .where(eq(jobPosition.id, id))
        .returning();

      return row != null;
    },
  };
};

export type PositionsService = ReturnType<typeof createPositionsService>;
