import { ORPCError } from "@orpc/server";
import { SelectCandidateUseCase } from "@zenith-hr/application/candidates/use-cases/select-candidate";
import { UploadCVUseCase } from "@zenith-hr/application/candidates/use-cases/upload-cv";
import { db } from "@zenith-hr/db";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { InMemoryCandidateRepository } from "@zenith-hr/infrastructure/candidates/in-memory-candidate-repository";
import { S3StorageService } from "@zenith-hr/infrastructure/services/s3-storage-service";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

// Composition Root (Manual DI)
// Note: In a real app, this repository should be a singleton or scoped properly.
// Since it's in-memory, we MUST instantiate it once outside the handler to persist data across requests (in memory).
const candidateRepository = new InMemoryCandidateRepository();
const storageService = new S3StorageService();

const uploadCVUseCase = new UploadCVUseCase(
  candidateRepository,
  storageService
);
const selectCandidateUseCase = new SelectCandidateUseCase(candidateRepository);

export const candidatesRouter = {
  uploadCV: protectedProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        candidateName: z.string().min(1),
        candidateEmail: z.string().email(),
        cvFile: z.instanceof(Buffer),
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Verify request exists and is in approved state (Controller Logic / Authorization)
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      if (request.status !== "APPROVED_OPEN") {
        throw new ORPCError("BAD_REQUEST");
      }

      // Execute Use Case
      const result = await uploadCVUseCase.execute(input);

      return result;
    }),

  selectCandidate: protectedProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        candidateId: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Get request
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      try {
        const result = await selectCandidateUseCase.execute(input);

        // Update request status to HIRING_IN_PROGRESS (This could be part of a separate Use Case or Domain Event)
        // For now, keeping it here or moving it to a "HiringService" would be better.
        // But strictly speaking, "Select Candidate" use case *should* probably handle this side effect if it's core domain logic.
        // Given the scope, I'll keep the DB update here to mirror previous logic, but ideally this belongs in the Use Case too.
        await db
          .update(manpowerRequest)
          .set({
            status: "HIRING_IN_PROGRESS",
            updatedAt: new Date(),
          })
          .where(eq(manpowerRequest.id, input.requestId));

        return result;
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "CANDIDATE_NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        throw error;
      }
    }),

  getCandidates: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Direct Repository access for query (CQRS-lite)
      const candidates = await candidateRepository.findByRequestId(
        input.requestId
      );

      return candidates.map((c) => ({
        candidateId: c.id,
        cvUrl: c.cvUrl,
        name: c.name,
        email: c.email,
      }));
    }),
};
