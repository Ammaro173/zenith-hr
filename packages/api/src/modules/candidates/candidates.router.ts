import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../shared/middleware";
import {
  getCandidatesSchema,
  selectCandidateSchema,
  uploadCvSchema,
} from "./candidates.schema";

// Helper to check if error is an Error with message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const candidatesRouter = {
  uploadCV: protectedProcedure
    .input(uploadCvSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.candidates.uploadCv(input);
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (message === "BAD_REQUEST") {
          throw new ORPCError("BAD_REQUEST");
        }
        throw error;
      }
    }),

  selectCandidate: protectedProcedure
    .input(selectCandidateSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.candidates.selectCandidate(
          input.requestId,
          input.candidateId,
        );
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (message === "CANDIDATE_NOT_FOUND") {
          throw new ORPCError("NOT_FOUND", {
            message: "Candidate not found",
          });
        }
        throw error;
      }
    }),

  getCandidates: protectedProcedure
    .input(getCandidatesSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.candidates.getCandidates(input.requestId),
    ),
};
