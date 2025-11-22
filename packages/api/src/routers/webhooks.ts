import { db } from "@zenith-hr/db";
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
    .handler(async ({ input }) => {
      // Mock DocuSign webhook handler
      // In production, validate webhook signature here

      if (
        input.event === "envelope_completed" &&
        input.data.status === "completed"
      ) {
        // Find contract by signing provider ID
        const [contractRecord] = await db
          .select()
          .from(contract)
          .where(eq(contract.signingProviderId, input.data.envelopeId))
          .limit(1);

        if (contractRecord) {
          // Update contract status to SIGNED
          await db
            .update(contract)
            .set({
              status: "SIGNED",
              updatedAt: new Date(),
            })
            .where(eq(contract.id, contractRecord.id));

          return { success: true, contractId: contractRecord.id };
        }
      }

      return { success: true, message: "Webhook received" };
    }),
};
