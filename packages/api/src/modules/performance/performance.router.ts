import { z } from "zod";
import { protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  createCycleSchema,
  createGoalSchema,
  createReviewSchema,
  updateGoalSchema,
  updateReviewSchema,
} from "./performance.schema";

export const performanceRouter = {
  createCycle: requireRoles(["HR", "ADMIN"])
    .input(createCycleSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.performance.createCycle(input),
    ),

  getCycles: protectedProcedure.handler(
    async ({ context }) => await context.services.performance.getCycles(),
  ),

  getCycle: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      const cycle = await context.services.performance.getCycle(input.id);
      if (!cycle) {
        throw new Error("NOT_FOUND");
      }
      return cycle;
    }),

  createReview: protectedProcedure
    .input(createReviewSchema)
    .handler(async ({ input, context }) => {
      // TODO: Add role check
      return await context.services.performance.createReview(input);
    }),

  getReview: protectedProcedure
    .input(z.object({ reviewId: z.string().uuid() }))
    .handler(
      async ({ input, context }) =>
        await context.services.performance.getReview(input.reviewId),
    ),

  updateReview: protectedProcedure
    .input(updateReviewSchema)
    .handler(async ({ input, context }) => {
      // TODO: Add permission check (reviewer or employee depending on status)
      return await context.services.performance.updateReview(input);
    }),

  createGoal: protectedProcedure
    .input(createGoalSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.performance.createGoal(input),
    ),

  updateGoal: protectedProcedure
    .input(updateGoalSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.performance.updateGoal(input),
    ),
};
