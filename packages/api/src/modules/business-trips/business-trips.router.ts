import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../shared/middleware";
import {
  addExpenseSchema,
  createTripSchema,
  tripActionSchema,
} from "./business-trips.schema";

export const businessTripsRouter = {
  create: protectedProcedure
    .input(createTripSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.businessTrips.create(
          input,
          context.session.user.id
        )
    ),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      const trip = await context.services.businessTrips.getById(input.id);
      if (!trip) {
        throw new ORPCError("NOT_FOUND");
      }
      return trip;
    }),

  getMyTrips: protectedProcedure.handler(
    async ({ context }) =>
      await context.services.businessTrips.getByRequester(
        context.session.user.id
      )
  ),

  transition: protectedProcedure
    .input(tripActionSchema)
    .handler(async ({ input, context }) => {
      try {
        return await context.services.businessTrips.transition(
          input,
          context.session.user.id
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (message === "INVALID_TRANSITION") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid status transition",
          });
        }
        throw error;
      }
    }),

  addExpense: protectedProcedure
    .input(addExpenseSchema)
    .handler(
      async ({ input, context }) =>
        await context.services.businessTrips.addExpense(input)
    ),

  getExpenses: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .handler(
      async ({ input, context }) =>
        await context.services.businessTrips.getExpenses(input.tripId)
    ),
};
