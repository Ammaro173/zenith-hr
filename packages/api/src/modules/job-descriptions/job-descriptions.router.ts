import { protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  createJobDescriptionSchema,
  deleteJobDescriptionSchema,
  getJobDescriptionByIdSchema,
  searchJobDescriptionsSchema,
  updateJobDescriptionSchema,
} from "./job-descriptions.schema";

export const jobDescriptionsRouter = {
  /**
   * Search job descriptions - available to all authenticated users
   */
  search: protectedProcedure
    .input(searchJobDescriptionsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.jobDescriptions.search(input);
    }),

  /**
   * Get job description by ID - available to all authenticated users
   */
  getById: protectedProcedure
    .input(getJobDescriptionByIdSchema)
    .handler(async ({ input, context }) => {
      return await context.services.jobDescriptions.getById(input.id);
    }),

  create: requireRoles(["ADMIN", "HR", "MANAGER", "CEO", "FINANCE", "IT"])
    .input(createJobDescriptionSchema)
    .handler(async ({ input, context }) => {
      return await context.services.jobDescriptions.create(input);
    }),

  //TODO you can only update yours ? except if you are mb HR or admin or it ?
  update: requireRoles(["ADMIN", "HR", "MANAGER", "CEO", "FINANCE", "IT"])
    .input(updateJobDescriptionSchema)
    .handler(async ({ input, context }) => {
      return await context.services.jobDescriptions.update(input);
    }),

  /**
   * Delete job description - ADMIN, HR, or MANAGER
   */
  delete: requireRoles(["ADMIN", "HR", "MANAGER", "CEO", "FINANCE", "IT"])
    .input(deleteJobDescriptionSchema)
    .handler(async ({ input, context }) => {
      return await context.services.jobDescriptions.delete(input);
    }),
};
