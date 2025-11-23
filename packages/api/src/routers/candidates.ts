import { ORPCError } from "@orpc/server";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

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

      // Verify request exists and is in approved state
      const [request] = await context.db
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

      // 1. Upload CV
      const cvKey = `cvs/${input.requestId}/${Date.now()}.pdf`;
      await context.storage.upload(cvKey, input.cvFile);

      // 2. Create Candidate ID
      const candidateId = `${input.requestId}_${input.candidateEmail}`;

      // 3. Save Candidate
      await context.db.insert(candidates).values({
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
      const [request] = await context.db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      // Check if candidate exists
      const [candidate] = await context.db
        .select()
        .from(candidates)
        .where(eq(candidates.id, input.candidateId))
        .limit(1);

      if (!candidate) {
        throw new ORPCError("NOT_FOUND", {
          message: "Candidate not found",
        });
      }

      // Update request status to HIRING_IN_PROGRESS
      await context.db
        .update(manpowerRequest)
        .set({
          status: "HIRING_IN_PROGRESS",
          updatedAt: new Date(),
        })
        .where(eq(manpowerRequest.id, input.requestId));

      // Ideally update candidate status too
      await context.db
        .update(candidates)
        .set({
          status: "SELECTED",
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, input.candidateId));

      return {
        success: true,
        candidateId: input.candidateId,
      };
    }),

  getCandidates: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const result = await context.db
        .select()
        .from(candidates)
        .where(eq(candidates.requestId, input.requestId));

      return result.map((c) => ({
        candidateId: c.id,
        cvUrl: c.cvUrl,
        name: c.name,
        email: c.email,
      }));
    }),
};
