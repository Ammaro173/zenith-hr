import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../shared/middleware";
import {
  getCandidatesSchema,
  selectCandidateSchema,
  uploadCvSchema,
} from "./candidates.schema";

export const candidatesRouter = {
  uploadCV: protectedProcedure
    .input(uploadCvSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      try {
        return await context.services.candidates.uploadCv(input);
      } catch (error: any) {
        if (error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (error.message === "BAD_REQUEST") {
          throw new ORPCError("BAD_REQUEST");
        }
        throw error;
      }
    }),

  selectCandidate: protectedProcedure
    .input(selectCandidateSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      try {
        return await context.services.candidates.selectCandidate(
          input.requestId,
          input.candidateId
        );
      } catch (error: any) {
        if (error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (error.message === "CANDIDATE_NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", {
            message: "Candidate not found",
          });
        }
        throw error;
      }
    }),

  getCandidates: protectedProcedure
    .input(getCandidatesSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      return context.services.candidates.getCandidates(input.requestId);
    }),
};
