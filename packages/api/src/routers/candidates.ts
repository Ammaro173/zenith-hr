import { ORPCError } from "@orpc/server";
import { db } from "@zenith-hr/db";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { uploadPDF } from "../services/storage";

// Mock candidate storage (in production, use a proper candidates table)
const candidateStorage = new Map<
  string,
  { cvUrl: string; name: string; email: string }
>();

export const candidatesRouter = {
  uploadCV: protectedProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        candidateName: z.string().min(1),
        candidateEmail: z.string().email(),
        cvFile: z.instanceof(Buffer), // In real implementation, handle file upload
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Verify request exists and is in approved state
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

      // Upload CV (mock - store in memory)
      const cvKey = `cvs/${input.requestId}/${Date.now()}.pdf`;
      await uploadPDF(cvKey, input.cvFile);

      // Store candidate info
      const candidateId = `${input.requestId}_${input.candidateEmail}`;
      candidateStorage.set(candidateId, {
        cvUrl: cvKey,
        name: input.candidateName,
        email: input.candidateEmail,
      });

      return {
        candidateId,
        cvUrl: cvKey,
      };
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

      // Get candidate
      const candidate = candidateStorage.get(input.candidateId);
      if (!candidate) {
        throw new ORPCError("NOT_FOUND");
      }

      // Update request status to HIRING_IN_PROGRESS
      await db
        .update(manpowerRequest)
        .set({
          status: "HIRING_IN_PROGRESS",
          updatedAt: new Date(),
        })
        .where(eq(manpowerRequest.id, input.requestId));

      return {
        success: true,
        candidate,
      };
    }),

  getCandidates: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Get all candidates for this request
      const candidates = Array.from(candidateStorage.entries())
        .filter(([id]) => id.startsWith(input.requestId))
        .map(([id, data]) => ({
          candidateId: id,
          ...data,
        }));

      return candidates;
    }),
};
