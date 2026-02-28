import { z } from "zod";

const positionRoleSchema = z.enum([
  "EMPLOYEE",
  "MANAGER",
  "HOD",
  "HOD_HR",
  "HOD_FINANCE",
  "HOD_IT",
  "CEO",
  "ADMIN",
]);

export const searchPositionsSchema = z.object({
  query: z.string().default(""),
  limit: z.number().min(1).max(100).default(50),
});

export type SearchPositionsInput = z.infer<typeof searchPositionsSchema>;

// Base schema (plain z.object, no preprocess/transform — same pattern as requests.schema)
const basePositionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  responsibilities: z.string().optional(),
  role: positionRoleSchema,
  grade: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  reportsToPositionId: z.string().uuid().optional().nullable(),
  active: z.boolean(),
});

export const createPositionSchema = basePositionSchema;

export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const createPositionDefaults: z.infer<typeof createPositionSchema> = {
  name: "",
  code: undefined,
  description: "",
  responsibilities: "",
  role: "EMPLOYEE",
  grade: "",
  departmentId: undefined,
  reportsToPositionId: undefined,
  active: true,
};

export const updatePositionSchema = basePositionSchema.partial();

export const getPositionByIdSchema = z.object({
  id: z.string().uuid(),
});

export const updatePositionByIdSchema = z.object({
  id: z.string().uuid(),
  data: updatePositionSchema,
});

export const deletePositionSchema = z.object({
  id: z.string().uuid(),
});

export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;

export interface PositionResponse {
  active: boolean;
  code: string;
  createdAt: Date;
  departmentId: string | null;
  departmentName: string | null;
  description: string | null;
  grade: string | null;
  id: string;
  name: string;
  reportsToPositionId: string | null;
  reportsToPositionName: string | null;
  responsibilities: string | null;
  role: string;
  updatedAt: Date;
}

export interface PositionSearchResponse {
  active: boolean;
  code: string;
  departmentId: string | null;
  departmentName: string | null;
  description: string | null;
  grade: string | null;
  id: string;
  name: string;
  reportsToPositionId: string | null;
  reportsToPositionName: string | null;
  responsibilities: string | null;
  role: string;
}
