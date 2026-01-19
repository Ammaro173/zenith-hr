import type { db as _db } from "@zenith-hr/db";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { StorageService } from "../../infrastructure/interfaces";
import { AppError } from "../../shared/errors";
import type { uploadCvSchema } from "./candidates.schema";

type UploadCvInput = z.infer<typeof uploadCvSchema>;

export const createCandidatesService = (
  db: typeof _db,
  storage: StorageService,
) => {
  return {
    async uploadCv(input: UploadCvInput) {
      // Verify request exists and is in approved state
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw AppError.notFound("Request not found");
      }

      if (request.status !== "APPROVED_OPEN") {
        throw AppError.badRequest("Request is not in APPROVED_OPEN status");
      }

      // 1. Upload CV
      const cvKey = `cvs/${input.requestId}/${Date.now()}.pdf`;
      const cvBuffer = Buffer.from(input.cvFileBase64, "base64");
      await storage.upload(cvKey, cvBuffer);

      // 2. Create Candidate ID
      const candidateId = `${input.requestId}_${input.candidateEmail}`;

      // 3. Save Candidate
      await db.insert(candidates).values({
        id: candidateId,
        requestId: input.requestId,
        name: input.candidateName,
        email: input.candidateEmail,
        cvUrl: cvKey,
      });

      return {
        candidateId,
        cvUrl: cvKey,
      };
    },

    async selectCandidate(requestId: string, candidateId: string) {
      return await db.transaction(async (tx) => {
        // Get request
        const [request] = await tx
          .select()
          .from(manpowerRequest)
          .where(eq(manpowerRequest.id, requestId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Request not found");
        }

        // Check if candidate exists
        const [candidate] = await tx
          .select()
          .from(candidates)
          .where(eq(candidates.id, candidateId))
          .limit(1);

        if (!candidate) {
          throw AppError.notFound("Candidate not found");
        }

        // Update request status to HIRING_IN_PROGRESS
        await tx
          .update(manpowerRequest)
          .set({
            status: "HIRING_IN_PROGRESS",
            updatedAt: new Date(),
          })
          .where(eq(manpowerRequest.id, requestId));

        // Update candidate status in the same transaction
        await tx
          .update(candidates)
          .set({
            status: "SELECTED",
            updatedAt: new Date(),
          })
          .where(eq(candidates.id, candidateId));

        return {
          success: true,
          candidateId,
        };
      });
    },

    async getCandidates(requestId: string) {
      const result = await db
        .select()
        .from(candidates)
        .where(eq(candidates.requestId, requestId));

      return result.map((c) => ({
        candidateId: c.id,
        cvUrl: c.cvUrl,
        name: c.name,
        email: c.email,
      }));
    },
  };
};

export type CandidatesService = ReturnType<typeof createCandidatesService>;
