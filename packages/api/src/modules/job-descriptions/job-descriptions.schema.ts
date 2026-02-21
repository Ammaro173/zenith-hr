import { z } from "zod";
import { userRoleSchema } from "../users/users.schema";

/**
 * Search job descriptions with server-side pagination
 */
export const searchJobDescriptionsSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export type SearchJobDescriptionsInput = z.infer<
  typeof searchJobDescriptionsSchema
>;

export interface SearchJobDescriptionsResponse {
  data: JobDescriptionResponse[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Create a new job description
 */
export const createJobDescriptionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  responsibilities: z.string().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  reportsToPositionId: z.string().uuid().nullable().optional(),
  assignedRole: userRoleSchema.default("EMPLOYEE"),
  grade: z.string().max(50).nullable().optional(),
  minSalary: z.number().int().min(0).nullable().optional(),
  maxSalary: z.number().int().min(0).nullable().optional(),
});

export type CreateJobDescriptionInput = z.infer<
  typeof createJobDescriptionSchema
>;

/**
 * Get job description by ID
 */
export const getJobDescriptionByIdSchema = z.object({
  id: z.string().uuid(),
});

export type GetJobDescriptionByIdInput = z.infer<
  typeof getJobDescriptionByIdSchema
>;

/**
 * Update job description
 */
export const updateJobDescriptionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  responsibilities: z.string().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  reportsToPositionId: z.string().uuid().nullable().optional(),
  assignedRole: userRoleSchema,
  grade: z.string().max(50).nullable().optional(),
  minSalary: z.number().int().min(0).nullable().optional(),
  maxSalary: z.number().int().min(0).nullable().optional(),
});

export type UpdateJobDescriptionInput = z.infer<
  typeof updateJobDescriptionSchema
>;

/**
 * Delete job description
 */
export const deleteJobDescriptionSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteJobDescriptionInput = z.infer<
  typeof deleteJobDescriptionSchema
>;

/**
 * Job description response type
 */
export interface JobDescriptionResponse {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  departmentId: string | null;
  departmentName: string | null;
  reportsToPositionId: string | null;
  reportsToPositionName: string | null;
  assignedRole:
    | "EMPLOYEE"
    | "MANAGER"
    | "HR"
    | "FINANCE"
    | "CEO"
    | "IT"
    | "ADMIN";
  grade: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
