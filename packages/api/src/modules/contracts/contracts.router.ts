import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../shared/middleware";
import {
  contractIdSchema,
  generateContractSchema,
  updateContractSchema,
} from "./contracts.schema";

export const contractsRouter = {
  generate: protectedProcedure
    .input(generateContractSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      try {
        return await context.services.contracts.generate(input);
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

  getById: protectedProcedure
    .input(contractIdSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }
      const contractRecord = await context.services.contracts.getById(input.id);

      if (!contractRecord) {
        throw new ORPCError("NOT_FOUND");
      }
      return contractRecord;
    }),

  updateCandidate: protectedProcedure
    .input(updateContractSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }
      try {
        return await context.services.contracts.updateCandidate(input);
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

  sendForSignature: protectedProcedure
    .input(contractIdSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }
      try {
        return await context.services.contracts.sendForSignature(input.id);
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

  getPresignedUrl: protectedProcedure
    .input(contractIdSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }
      try {
        return await context.services.contracts.getPresignedUrl(input.id);
      } catch (error: any) {
        if (error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        throw error;
      }
    }),
};
