import type { db as _db } from "@zenith-hr/db";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { uploadCvSchema } from "./candidates.schema";

// Placeholder type for storage service
type StorageService = {
  upload(key: string, body: Buffer): Promise<string>;
};

type UploadCvInput = z.infer<typeof uploadCvSchema>;

export const createCandidatesService = (
  db: typeof _db,
  storage: StorageService
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
        throw new Error("NOT_FOUND");
      }

      if (request.status !== "APPROVED_OPEN") {
        throw new Error("BAD_REQUEST");
      }

      // 1. Upload CV
      const cvKey = `cvs/${input.requestId}/${Date.now()}.pdf`;
      await storage.upload(cvKey, input.cvFile);

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
      // Get request
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error("NOT_FOUND");
      }

      // Check if candidate exists
      const [candidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);

      if (!candidate) {
        throw new Error("CANDIDATE_NOT_FOUND");
      }

      // Update request status to HIRING_IN_PROGRESS
      await db
        .update(manpowerRequest)
        .set({
          status: "HIRING_IN_PROGRESS",
          updatedAt: new Date(),
        })
        .where(eq(manpowerRequest.id, requestId));

      // Ideally update candidate status too
      await db
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
