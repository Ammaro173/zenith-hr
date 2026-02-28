import { z } from "zod";

// Schema for listing departments with pagination, filtering, and sorting
export const listDepartmentsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type ListDepartmentsInput = z.infer<typeof listDepartmentsSchema>;

// Schema for creating a department
export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const createDepartmentDefaults: CreateDepartmentInput = {
  name: "",
};

// Schema for updating a department
export const updateDepartmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// Schema for getting a department by ID
export const getDepartmentByIdSchema = z.object({
  id: z.string(),
});

export type GetDepartmentByIdInput = z.infer<typeof getDepartmentByIdSchema>;

// Schema for deleting a department
export const deleteDepartmentSchema = z.object({
  id: z.string(),
});

export type DeleteDepartmentInput = z.infer<typeof deleteDepartmentSchema>;

// Department response type (with head of department info)
export interface DepartmentResponse {
  createdAt: Date;
  id: string;
  name: string;
  updatedAt: Date;
}

// Paginated result type
export interface PaginatedDepartmentsResult {
  data: DepartmentResponse[];
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}
