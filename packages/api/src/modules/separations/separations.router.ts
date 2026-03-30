import { z } from "zod";
import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  addChecklistItemSchema,
  approveByHrSchema,
  approveByManagerSchema,
  createSeparationSchema,
  getSeparationDocumentDownloadUrlSchema,
  listEligibleSeparationSubjectsSchema,
  rejectByHrSchema,
  rejectByManagerSchema,
  reorderChecklistItemsSchema,
  startClearanceSchema,
  updateChecklistSchema,
  updateSeparationSchema,
  uploadSeparationDocumentSchema,
} from "./separations.schema";

export const separationsRouter = o.router({
  create: protectedProcedure
    .input(createSeparationSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.separations.create(
          input,
          context.session.user.id,
        ),
    ),

  listEligibleSubjects: protectedProcedure
    .input(listEligibleSeparationSubjectsSchema)
    .handler(async ({ input, context }) =>
      context.services.separations.listEligibleSubjects(
        context.session.user.id,
        input,
      ),
    ),

  get: protectedProcedure
    .input(z.object({ separationId: z.string().uuid() }))
    .handler(async ({ input, context }) =>
      context.services.separations.getForViewer(
        input.separationId,
        context.session.user.id,
      ),
    ),

  update: requireRoles([
    "MANAGER",
    "HOD",
    "HOD_IT",
    "HOD_FINANCE",
    "CEO",
    "HOD_HR",
    "ADMIN",
  ])
    .input(updateSeparationSchema)
    .handler(async ({ input, context }) =>
      context.services.separations.update(input, context.session.user.id),
    ),

  approveByManager: requireRoles([
    "MANAGER",
    "HOD",
    "HOD_IT",
    "HOD_FINANCE",
    "CEO",
    "HOD_HR",
    "ADMIN",
  ])
    .input(approveByManagerSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.approveByManager(
        input,
        context.session.user.id,
      );
    }),

  approveByHr: requireRoles(["HOD_HR", "ADMIN"])
    .input(approveByHrSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.approveByHr(
        input,
        context.session.user.id,
      );
    }),

  rejectByManager: requireRoles([
    "MANAGER",
    "HOD",
    "HOD_IT",
    "HOD_FINANCE",
    "CEO",
    "HOD_HR",
    "ADMIN",
  ])
    .input(rejectByManagerSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.rejectByManager(
        input,
        context.session.user.id,
      );
    }),

  rejectByHr: requireRoles(["HOD_HR", "ADMIN"])
    .input(rejectByHrSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.rejectByHr(
        input,
        context.session.user.id,
      );
    }),

  startClearance: requireRoles(["HOD_HR"])
    .input(startClearanceSchema)
    .handler(async ({ input, context }) =>
      context.services.separations.startClearance(
        input,
        context.session.user.id,
      ),
    ),

  updateChecklist: protectedProcedure
    .input(updateChecklistSchema)
    .handler(async ({ input, context }) =>
      context.services.separations.updateChecklist(
        input,
        context.session.user.id,
      ),
    ),

  addChecklistItem: requireRoles(["HOD_HR", "ADMIN"])
    .input(addChecklistItemSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.addChecklistItem(
        input,
        context.session.user.id,
      );
    }),

  reorderChecklistItems: requireRoles(["HOD_HR", "ADMIN"])
    .input(reorderChecklistItemsSchema)
    .handler(async ({ input, context }) => {
      return await context.services.separations.reorderChecklistItems(
        input,
        context.session.user.id,
      );
    }),

  uploadDocument: protectedProcedure
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

  getSeparations: protectedProcedure.handler(async ({ context }) =>
    context.services.separations.getListForViewer(context.session.user.id),
  ),
});
