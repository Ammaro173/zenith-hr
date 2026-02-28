import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  createUserSchema,
  deactivateUserSchema,
  deleteUserSchema,
  forceDeleteUserSchema,
  getHierarchySchema,
  getUserByIdSchema,
  getUserSessionsSchema,
  listUsersSchema,
  offboardingPrecheckSchema,
  resetPasswordSchema,
  revokeAllSessionsSchema,
  revokeSessionSchema,
  searchUsersSchema,
  updateUserSchema,
} from "./users.schema";

export const usersRouter = o.router({
  // Search users for autocomplete (all authenticated users)
  search: protectedProcedure
    .input(searchUsersSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.users.search(input.query, input.limit),
    ),

  // List users with pagination and filtering (role-restricted)
  list: requireRoles([
    "ADMIN",
    "HOD_HR",
    "CEO",
    "HOD_IT",
    "HOD_FINANCE",
    "MANAGER",
  ])
    .input(listUsersSchema)
    .handler(async ({ input, context }) => {
      const currentUser = {
        id: context.session.user.id,
        role: (context.session.user as { role?: string }).role ?? "EMPLOYEE",
      };
      return await context.services.users.list(input, currentUser);
    }),

  // Get departments for filter dropdown (redirects to departments service)
  getDepartments: requireRoles([
    "ADMIN",
    "HOD_HR",
    "CEO",
    "HOD_IT",
    "HOD_FINANCE",
    "MANAGER",
  ]).handler(
    async ({ context }) => await context.services.departments.getAll(),
  ),

  // Get organizational hierarchy for org chart
  getHierarchy: protectedProcedure
    .input(getHierarchySchema)
    .handler(async ({ input, context }) => {
      const currentUser = {
        id: context.session.user.id,
        role: (context.session.user as { role?: string }).role ?? "EMPLOYEE",
      };
      return await context.services.users.getHierarchy(
        currentUser,
        input.scope,
      );
    }),

  // Create user (ADMIN, HR only)
  create: requireRoles(["ADMIN", "HOD_HR"])
    .input(createUserSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.create(input);
    }),

  // Update user (ADMIN, HR only)
  update: requireRoles(["ADMIN", "HOD_HR"])
    .input(updateUserSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.update(input);
    }),

  // Get user by ID (ADMIN, HR only)
  getById: requireRoles(["ADMIN", "HOD_HR"])
    .input(getUserByIdSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.getById(input.id);
    }),

  // Deactivate user (ADMIN, HR only)
  deactivate: requireRoles(["ADMIN", "HOD_HR"])
    .input(deactivateUserSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.deactivate(input.id);
    }),

  // Offboarding precheck (ADMIN, HR)
  offboardingPrecheck: requireRoles(["ADMIN", "HOD_HR"])
    .input(offboardingPrecheckSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.offboardingPrecheck(input.id);
    }),

  // Delete user (ADMIN only)
  delete: requireRoles(["ADMIN"])
    .input(deleteUserSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.delete(input.id);
    }),

  // Force delete user (ADMIN only)
  forceDelete: requireRoles(["ADMIN"])
    .input(forceDeleteUserSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.forceDelete(input.id);
    }),

  // Get user sessions (ADMIN only)
  getSessions: requireRoles(["ADMIN"])
    .input(getUserSessionsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.getSessions(input.userId);
    }),

  // Revoke specific session (ADMIN only)
  revokeSession: requireRoles(["ADMIN"])
    .input(revokeSessionSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.revokeSession(input.sessionId);
    }),

  // Revoke all sessions (ADMIN only)
  revokeAllSessions: requireRoles(["ADMIN"])
    .input(revokeAllSessionsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.revokeAllSessions(input.userId);
    }),

  // Reset password (ADMIN, HR only)
  resetPassword: requireRoles(["ADMIN", "HOD_HR"])
    .input(resetPasswordSchema)
    .handler(async ({ input, context }) => {
      return await context.services.users.resetPassword(
        input.userId,
        input.newPassword,
      );
    }),
});
