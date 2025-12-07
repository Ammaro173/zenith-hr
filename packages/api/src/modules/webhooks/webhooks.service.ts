import type { db as _db } from "@zenith-hr/db";
import { contract } from "@zenith-hr/db/schema/contracts";
import { eq } from "drizzle-orm";

type DocuSignStatus = "completed" | "voided" | "declined" | string;

export const createWebhooksService = (db: typeof _db) => ({
  async handleDocuSignEvent(envelopeId: string, status: DocuSignStatus) {
    const [contractRecord] = await db
      .select()
      .from(contract)
      .where(eq(contract.signingProviderId, envelopeId))
      .limit(1);

    if (!contractRecord) {
      return { success: false, message: "Contract not found" };
    }

    let newStatus: "SIGNED" | "VOIDED" | null = null;
    if (status === "completed") {
      newStatus = "SIGNED";
    } else if (status === "voided" || status === "declined") {
      newStatus = "VOIDED";
    }

    if (newStatus) {
      await db
        .update(contract)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(contract.id, contractRecord.id));
    }

    return {
      success: true,
      contractId: contractRecord.id,
      status: newStatus ?? contractRecord.status,
    };
  },
});

export type WebhooksService = ReturnType<typeof createWebhooksService>;
