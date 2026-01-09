import { z } from "zod";
import { publicProcedure } from "../../shared/middleware";

export const webhooksRouter = {
  docusign: publicProcedure
    .input(
      z.object({
        event: z.string(),
        data: z.object({
          envelopeId: z.string(),
          status: z.string(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      // Mock DocuSign webhook handler
      // In production, validate webhook signature here

      const envelopeId = input.data.envelopeId;
      const status = input.data.status;

      return await context.services.webhooks.handleDocuSignEvent(
        envelopeId,
        status,
      );
    }),
};
