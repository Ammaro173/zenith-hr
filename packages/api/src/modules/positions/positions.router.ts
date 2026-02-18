import { protectedProcedure, requireRoles } from "../../shared/middleware";
import { searchPositionsSchema } from "./positions.schema";

export const positionsRouter = {
  search: protectedProcedure
    .input(searchPositionsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.positions.search(input);
    }),

  searchForAdmin: requireRoles([
    "ADMIN",
    "HR",
    "CEO",
    "IT",
    "FINANCE",
    "MANAGER",
  ])
    .input(searchPositionsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.positions.search(input);
    }),
};
