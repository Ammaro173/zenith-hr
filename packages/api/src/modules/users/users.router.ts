import { protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  getHierarchySchema,
  listUsersSchema,
  searchUsersSchema,
} from "./users.schema";

export const usersRouter = {
  // Search users for autocomplete (all authenticated users)
  search: protectedProcedure
    .input(searchUsersSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.users.search(input.query, input.limit),
    ),

  // List users with pagination and filtering (role-restricted)
  list: requireRoles(["ADMIN", "HR", "CEO", "IT", "FINANCE", "MANAGER"])
    .input(listUsersSchema)
    .handler(async ({ input, context }) => {
      const currentUser = {
        id: context.session.user.id,
        role: (context.session.user as { role?: string }).role ?? "REQUESTER",
      };
      return await context.services.users.list(input, currentUser);
    }),

  // Get departments for filter dropdown
  getDepartments: requireRoles([
    "ADMIN",
    "HR",
    "CEO",
    "IT",
    "FINANCE",
    "MANAGER",
  ]).handler(
    async ({ context }) => await context.services.users.getDepartments(),
  ),

  // Get organizational hierarchy for org chart
  getHierarchy: protectedProcedure
    .input(getHierarchySchema)
    .handler(async ({ input, context }) => {
      const currentUser = {
        id: context.session.user.id,
        role: (context.session.user as { role?: string }).role ?? "REQUESTER",
      };
      return await context.services.users.getHierarchy(
        currentUser,
        input.scope,
      );
    }),
};
