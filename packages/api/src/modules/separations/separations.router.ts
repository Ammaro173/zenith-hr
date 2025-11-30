import { z } from "zod";
import { protectedProcedure } from "../../shared/middleware";
import {
  createSeparationSchema,
  updateChecklistSchema,
  updateSeparationSchema,
} from "./separations.schema";

export const separationsRouter = {
  create: protectedProcedure
    .input(createSeparationSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.separations.create(
          input,
          context.session.user.id
        )
    ),

  get: protectedProcedure
    .input(z.object({ separationId: z.string().uuid() }))
    .handler(
      async ({ input, context }) =>
        await context.services.separations.get(input.separationId)
    ),

  update: protectedProcedure
    .input(updateSeparationSchema)
    .handler(async ({ input, context }) => {
      // TODO: Add permission checks
      return await context.services.separations.update(input);
    }),

  updateChecklist: protectedProcedure
    .input(updateChecklistSchema)
    .handler(async ({ input, context }) => {
      // TODO: Add permission checks (only specific departments)
      return await context.services.separations.updateChecklist(
        input,
        context.session.user.id
      );
    }),

  getSeparations: protectedProcedure.handler(
    async ({ context }) => await context.services.separations.getAll()
  ),
};
