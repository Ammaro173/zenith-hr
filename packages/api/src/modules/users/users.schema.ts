import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.string().default(""),
  limit: z.number().optional().default(100),
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

// ============================================
// User Management Schemas
// ============================================

// Enums matching database
export const userRoleSchema = z.enum([
  "REQUESTER",
  "MANAGER",
  "HR",
  "FINANCE",
  "CEO",
  "IT",
  "ADMIN",
]);

export const userStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]);

// Create User Input
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  sapNo: z.string().min(1).max(50),
  role: userRoleSchema.default("REQUESTER"),
  status: userStatusSchema.default("ACTIVE"),
  departmentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  reportsToSlotCode: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update User Input
export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  sapNo: z.string().min(1).max(50).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  departmentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  reportsToSlotCode: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Get User by ID
export const getUserByIdSchema = z.object({
  id: z.string(),
});

export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;

// Deactivate User
export const deactivateUserSchema = z.object({
  id: z.string(),
});

export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;

// Delete User
export const deleteUserSchema = z.object({
  id: z.string(),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

// Get User Sessions
export const getUserSessionsSchema = z.object({
  userId: z.string(),
});

export type GetUserSessionsInput = z.infer<typeof getUserSessionsSchema>;

// Revoke Session
export const revokeSessionSchema = z.object({
  sessionId: z.string(),
});

export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;

// Revoke All Sessions
export const revokeAllSessionsSchema = z.object({
  userId: z.string(),
});

export type RevokeAllSessionsInput = z.infer<typeof revokeAllSessionsSchema>;

// Reset Password
export const resetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(8).max(128),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// User Session Response
export interface UserSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

// User Response (without sensitive data)
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  sapNo: string;
  role: string;
  status: string;
  departmentId: string | null;
  departmentName: string | null;
  managerSlotCode: string | null;
  managerName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
