import { z } from "zod";
import { protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  createSeparationSchema,
  startClearanceSchema,
  updateChecklistSchema,
  updateSeparationSchema,
} from "./separations.schema";

export const separationsRouter = {
  create: requireRoles(["REQUESTER", "MANAGER", "HR", "ADMIN"])
    .input(createSeparationSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.separations.create(
          input,
          context.session.user.id,
        ),
    ),

  get: protectedProcedure
    .input(z.object({ separationId: z.string().uuid() }))
    .handler(
      async ({ input, context }) =>
        await context.services.separations.get(input.separationId),
    ),

  update: requireRoles(["MANAGER", "HR", "ADMIN"])
    .input(updateSeparationSchema)
    .handler(async ({ input, context }) => {
      // TODO: Add permission checks
      return await context.services.separations.update(input);
    }),

  startClearance: requireRoles(["HR"])
    .input(startClearanceSchema)
    .handler(async ({ input, context }) =>
      context.services.separations.startClearance(
        input,
        context.session.user.id,
      ),
    ),

  updateChecklist: protectedProcedure
    .input(updateChecklistSchema)
    .handler(async ({ input, context }) => {
      // TODO: Add permission checks (only specific departments)
      return await context.services.separations.updateChecklist(
        input,
        context.session.user.id,
      );
    }),

  getSeparations: protectedProcedure.handler(
    async ({ context }) => await context.services.separations.getAll(),
  ),
};
