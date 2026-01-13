import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(10),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;

// Schema for listing users with pagination, filtering, and sorting
export const listUsersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z
    .array(
      z.enum(["REQUESTER", "MANAGER", "HR", "FINANCE", "CEO", "IT", "ADMIN"]),
    )
    .optional(),
  status: z.array(z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"])).optional(),
  departmentId: z.array(z.string().uuid()).optional(),
  sortBy: z
    .enum(["name", "email", "role", "status", "sapNo", "createdAt"])
    .default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

// Schema for getting organizational hierarchy
export const getHierarchySchema = z.object({
  scope: z.enum(["team", "organization"]).default("team"),
});

export type GetHierarchyInput = z.infer<typeof getHierarchySchema>;

// Hierarchical node structure for org chart
export interface HierarchyNode {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: string;
  status: string;
  departmentName: string | null;
  children: HierarchyNode[];
}
