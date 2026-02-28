import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.string().default(""),
  limit: z.number().optional().default(100),
});

export const listUsersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  departmentId: z.array(z.string().uuid()).nullable().optional().default(null),
  status: z
    .array(z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]))
    .nullable()
    .optional()
    .default(null),
  role: z
    .array(
      z.enum([
        "EMPLOYEE",
        "MANAGER",
        "HOD",
        "HOD_HR",
        "HOD_FINANCE",
        "CEO",
        "HOD_IT",
        "ADMIN",
      ]),
    )
    .nullable()
    .optional()
    .default(null),
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
  children: HierarchyNode[];
  departmentName: string | null;
  email: string;
  id: string;
  /** True when this node represents an unoccupied position slot (no real user). */
  isVacancy?: boolean;
  name: string;
  /** The name of the job position this node occupies (or the vacant position name). */
  positionName?: string | null;
  role: string;
  sapNo: string;
  status: string;
}

// ============================================
// User Management Schemas
// ============================================

// Enums matching database
export const userRoleSchema = z.enum([
  "EMPLOYEE",
  "MANAGER",
  "HOD",
  "HOD_HR",
  "HOD_FINANCE",
  "HOD_IT",
  "CEO",
  "ADMIN",
]);

export const userStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]);

// Create User Input
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  sapNo: z.string().min(1).max(50),
  status: userStatusSchema,
  positionId: z.string().uuid(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createUserDefaults: CreateUserInput = {
  name: "",
  email: "",
  password: "",
  sapNo: "",
  status: "ACTIVE",
  positionId: "",
};

// Update User Input
export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  sapNo: z.string().min(1).max(50).optional(),
  status: userStatusSchema.optional(),
  positionId: z.string().uuid().optional(),
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

export const offboardingPrecheckSchema = z.object({
  id: z.string(),
});

export type OffboardingPrecheckInput = z.infer<
  typeof offboardingPrecheckSchema
>;

// Delete User
export const deleteUserSchema = z.object({
  id: z.string(),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

export const forceDeleteUserSchema = z.object({
  id: z.string(),
});

export type ForceDeleteUserInput = z.infer<typeof forceDeleteUserSchema>;

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
  createdAt: Date;
  expiresAt: Date;
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// User Response (without sensitive data)
export interface UserResponse {
  createdAt: Date;
  departmentId: string | null;
  departmentName: string | null;
  email: string;
  id: string;
  managerName: string | null;
  name: string;
  positionCode: string | null;
  positionId: string | null;
  positionName: string | null;
  reportsToPositionId: string | null;
  role: string;
  sapNo: string;
  status: string;
  updatedAt: Date;
}

export type OffboardingBlockerModule =
  | "slotAssignments"
  | "manpowerRequests"
  | "businessTrips"
  | "separations"
  | "performanceReviews"
  | "importHistory";

export interface OffboardingBlockerDetail {
  id: string;
  reason: string;
  status: string | null;
}

export interface OffboardingPrecheckResult {
  canDeactivate: boolean;
  canDelete: boolean;
  counts: Record<OffboardingBlockerModule, number>;
  details: Record<OffboardingBlockerModule, OffboardingBlockerDetail[]>;
  hasDeleteBlockers: boolean;
  hasOperationalBlockers: boolean;
  userId: string;
}
