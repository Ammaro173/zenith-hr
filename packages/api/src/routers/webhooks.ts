import { HandleDocusignWebhookUseCase } from "@zenith-hr/application/webhooks/use-cases/handle-docusign";
import { DrizzleContractRepository } from "@zenith-hr/infrastructure/contracts/drizzle-contract-repository";
import { z } from "zod";
import { publicProcedure } from "../index";

// Composition Root (Manual DI)
const contractRepository = new DrizzleContractRepository();
const handleDocusignWebhookUseCase = new HandleDocusignWebhookUseCase(
  contractRepository
);

export const webhooksRouter = {
  docusign: publicProcedure
    .input(
      z.object({
        event: z.string(),
        data: z.object({
          envelopeId: z.string(),
          status: z.string(),
        }),
      })
    )
    .handler(async ({ input }) => {
      // Mock DocuSign webhook handler
      // In production, validate webhook signature here

      const result = await handleDocusignWebhookUseCase.execute(input);

      return result;
    }),
};
