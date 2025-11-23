import { contract } from "@zenith-hr/db/schema/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "../index";

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
    .handler(async ({ input, context }) => {
      // Mock DocuSign webhook handler
      // In production, validate webhook signature here

      const envelopeId = input.data.envelopeId;
      const status = input.data.status;

      // Find contract by envelope ID (using signingProviderId)
      const [contractRecord] = await context.db
        .select()
        .from(contract)
        .where(eq(contract.signingProviderId, envelopeId))
        .limit(1);

      if (!contractRecord) {
        // Webhook received for unknown envelope, maybe log it but don't crash
        return { success: false, message: "Contract not found" };
      }

      if (status === "completed") {
        await context.db
          .update(contract)
          .set({
            status: "SIGNED",
            updatedAt: new Date(),
          })
          .where(eq(contract.id, contractRecord.id));
      } else if (status === "voided" || status === "declined") {
        await context.db
          .update(contract)
          .set({
            status: "VOIDED",
            updatedAt: new Date(),
          })
          .where(eq(contract.id, contractRecord.id));
      }

      return { success: true };
    }),
};
