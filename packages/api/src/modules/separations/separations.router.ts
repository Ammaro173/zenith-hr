import { z } from "zod";
import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  addChecklistItemSchema,
  approveByHrSchema,
  approveByManagerSchema,
  createSeparationSchema,
  getSeparationDocumentDownloadUrlSchema,
  reorderChecklistItemsSchema,
  startClearanceSchema,
  updateChecklistSchema,
  updateSeparationSchema,
  uploadSeparationDocumentSchema,
} from "./separations.schema";

export const separationsRouter = o.router({
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

  approveByManager: requireRoles(["MANAGER", "HR", "ADMIN"])
    .input(approveByManagerSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.approveByManager(
        input,
        context.session.user.id,
      );
    }),

  approveByHr: requireRoles(["HR", "ADMIN"])
    .input(approveByHrSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.approveByHr(
        input,
        context.session.user.id,
      );
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

  addChecklistItem: requireRoles(["HR", "ADMIN"])
    .input(addChecklistItemSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.addChecklistItem(
        input,
        context.session.user.id,
      );
    }),

  reorderChecklistItems: requireRoles(["HR", "ADMIN"])
    .input(reorderChecklistItemsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.reorderChecklistItems(
        input,
        context.session.user.id,
      );
    }),

  uploadDocument: requireRoles(["REQUESTER", "MANAGER", "HR", "ADMIN"])
    .input(uploadSeparationDocumentSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.uploadDocument(
        input,
        context.session.user.id,
      );
    }),

  getDocumentDownloadUrl: protectedProcedure
    .input(getSeparationDocumentDownloadUrlSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.getDocumentDownloadUrl(
        input,
        context.session.user.id,
      );
    }),

  getMyClearanceInbox: protectedProcedure.handler(
    async ({ context }) =>
      await context.services.separations.getMyClearanceInbox(
        context.session.user.id,
      ),
  ),

  getSeparations: protectedProcedure.handler(
    async ({ context }) => await context.services.separations.getAll(),
  ),
});
